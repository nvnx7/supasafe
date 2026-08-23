use starknet::ContractAddress;
use starknet::account::Call;

/// An owner's account address paired with the STARK public key that account signs with.
///
/// Both are load-bearing. A wallet signing SNIP-12 typed data binds the message to the account
/// doing the signing, so the address is what forms an owner's approval message; the public key
/// is what verifies it. Verifying by key rather than by dispatching `is_valid_signature` keeps
/// `_verify_threshold` free of cross-contract calls, which the validation phase forbids — that
/// is what lets this account still send its own transactions.
///
/// The key is therefore the authority and the address is metadata: this contract cannot cheaply
/// prove the two belong together, so callers are responsible for reading an owner's key from
/// their deployed account rather than asserting it.
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct Owner {
    pub address: ContractAddress,
    pub public_key: felt252,
}

/// SRC5 interface id for `ICustomSignatureValidation::is_custom_signature_valid`.
/// Matches `selector!("is_custom_signature_valid")` as checked by the STRK20 privacy pool
/// (`packages/privacy/src/utils.cairo::ICUSTOM_SIGNATURE_VALIDATION_ID`).
pub const ICUSTOM_SIGNATURE_VALIDATION_ID: felt252 = selector!("is_custom_signature_valid");

#[starknet::interface]
pub trait ICustomSignatureValidation<TState> {
    fn is_custom_signature_valid(
        self: @TState, calls: Span<Call>, additional_data: Span<felt252>, signature: Span<felt252>,
    ) -> felt252;
}

#[starknet::interface]
pub trait IMultisig<TState> {
    fn get_owners(self: @TState) -> Span<Owner>;
    fn get_threshold(self: @TState) -> u32;
    fn set_owners(ref self: TState, owners: Span<Owner>, threshold: u32);
}

/// Protocol-invoked validation for `DEPLOY_ACCOUNT` and `DECLARE` transactions.
///
/// `__validate_deploy__` receives the constructor calldata spread after `class_hash` and
/// `contract_address_salt`, so its tail must mirror this account's constructor
/// (`owners`, `threshold`). OpenZeppelin's `IDeployable` is typed for a single-key account
/// (`public_key: felt252`) and therefore cannot be reused here.
#[starknet::interface]
pub trait IDeployable<TState> {
    fn __validate_deploy__(
        self: @TState,
        class_hash: felt252,
        contract_address_salt: felt252,
        owners: Span<Owner>,
        threshold: u32,
    ) -> felt252;
    fn __validate_declare__(self: @TState, class_hash: felt252) -> felt252;
}

#[starknet::contract(account)]
pub mod PrivateMultisigAccount {
    use core::ecdsa::check_ecdsa_signature;
    use core::num::traits::Zero;
    use openzeppelin::account::extensions::SRC9Component;
    use openzeppelin::interfaces::accounts::{ISRC6, ISRC6_ID};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::introspection::src5::SRC5Component::InternalTrait as SRC5InternalTrait;
    use openzeppelin::utils::execution::execute_single_call;
    use starknet::account::Call;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{
        ContractAddress, get_caller_address, get_contract_address, get_tx_info, VALIDATED,
    };
    use crate::hashing::{approval_context, compute_call_set_hash, owner_approval_hash};
    use super::{
        ICUSTOM_SIGNATURE_VALIDATION_ID, ICustomSignatureValidation, IDeployable, IMultisig, Owner,
    };

    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: SRC9Component, storage: src9, event: SRC9Event);

    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    /// SNIP-9 outside execution. The component is account-agnostic: it verifies the SNIP-12
    /// `OutsideExecution` hash against this contract's own `is_valid_signature`, so the t-of-n
    /// threshold applies to relayed executions exactly as it does to direct ones.
    #[abi(embed_v0)]
    impl OutsideExecutionV2Impl =
        SRC9Component::OutsideExecutionV2Impl<ContractState>;
    impl OutsideExecutionInternalImpl = SRC9Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        src9: SRC9Component::Storage,
        owners: Map<u32, Owner>,
        owners_count: u32,
        threshold: u32,
    }

    /// Emitted once per owner at construction and on every `set_owners`, keyed by `owner` so a
    /// client can find every multisig an address belongs to with one filtered `getEvents` call
    /// and render "t of n" without a follow-up read.
    ///
    /// Removals emit nothing — a stale hit is resolved against `get_owners`.
    #[derive(Drop, starknet::Event)]
    pub struct OwnerUpdated {
        #[key]
        pub owner: ContractAddress,
        pub public_key: felt252,
        pub owners_count: u32,
        pub threshold: u32,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        SRC9Event: SRC9Component::Event,
        OwnerUpdated: OwnerUpdated,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owners: Span<Owner>, threshold: u32) {
        self._set_owners(owners, threshold);
        self.src5.register_interface(ISRC6_ID);
        self.src5.register_interface(ICUSTOM_SIGNATURE_VALIDATION_ID);
        // Registers ISRC9_V2_ID — paymasters require it to relay for this account.
        self.src9.initializer();
    }

    #[abi(embed_v0)]
    impl DeployableImpl of IDeployable<ContractState> {
        /// Validates the `DEPLOY_ACCOUNT` transaction that deploys this account. The constructor
        /// has already run by this point, so the owner set and threshold are readable from
        /// storage and the deploying signature is held to the same t-of-n rule.
        fn __validate_deploy__(
            self: @ContractState,
            class_hash: felt252,
            contract_address_salt: felt252,
            owners: Span<Owner>,
            threshold: u32,
        ) -> felt252 {
            self._validate_tx()
        }

        fn __validate_declare__(self: @ContractState, class_hash: felt252) -> felt252 {
            self._validate_tx()
        }
    }

    #[abi(embed_v0)]
    impl CustomSignatureValidationImpl of ICustomSignatureValidation<ContractState> {
        /// Validates that a t-of-n threshold of owners authorized `calls`, via the STRK20 privacy
        /// pool's custom-signature-validation path (`assert_valid_signature`, checked I).
        /// Returns `VALIDATED` for a threshold-satisfying signature bundle and `0` otherwise.
        /// Reverts only on a malformed signature bundle (wrong length, out-of-range or
        /// duplicate/unsorted owner indices) — never on a well-formed but insufficient one.
        fn is_custom_signature_valid(
            self: @ContractState,
            calls: Span<Call>,
            additional_data: Span<felt252>,
            signature: Span<felt252>,
        ) -> felt252 {
            let msg_hash = compute_call_set_hash(get_contract_address(), calls, additional_data);
            if self._verify_threshold(msg_hash, signature) {
                VALIDATED
            } else {
                0
            }
        }
    }

    #[abi(embed_v0)]
    impl ISRC6Impl of ISRC6<ContractState> {
        fn __validate__(self: @ContractState, calls: Array<Call>) -> felt252 {
            self._validate_tx()
        }

        fn __execute__(self: @ContractState, calls: Array<Call>) {
            assert(get_caller_address().is_zero(), 'INVALID_CALLER');
            for call in calls.span() {
                execute_single_call(call);
            }
        }

        fn is_valid_signature(
            self: @ContractState, hash: felt252, signature: Array<felt252>,
        ) -> felt252 {
            if self._verify_threshold(hash, signature.span()) {
                VALIDATED
            } else {
                0
            }
        }
    }

    #[abi(embed_v0)]
    impl MultisigImpl of IMultisig<ContractState> {
        fn get_owners(self: @ContractState) -> Span<Owner> {
            let count = self.owners_count.read();
            let mut owners = array![];
            let mut i: u32 = 0;
            while i < count {
                owners.append(self.owners.read(i));
                i += 1;
            };
            owners.span()
        }

        fn get_threshold(self: @ContractState) -> u32 {
            self.threshold.read()
        }

        /// Replaces the owner set/threshold atomically. Self-authorized only: reachable exclusively
        /// via a `calls` entry inside a transaction that already satisfied this multisig's own
        /// t-of-n check in `__validate__`/`is_custom_signature_valid`.
        fn set_owners(ref self: ContractState, owners: Span<Owner>, threshold: u32) {
            self.assert_only_self();
            self._set_owners(owners, threshold);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn assert_only_self(self: @ContractState) {
            assert(get_caller_address() == get_contract_address(), 'UNAUTHORIZED');
        }

        /// Shared protocol-level validation for `__validate__`, `__validate_deploy__` and
        /// `__validate_declare__`: the transaction hash must carry a t-of-n owner quorum.
        fn _validate_tx(self: @ContractState) -> felt252 {
            let tx_info = get_tx_info().unbox();
            assert(
                self._verify_threshold(tx_info.transaction_hash, tx_info.signature),
                'INVALID_SIGNATURE',
            );
            VALIDATED
        }

        fn _set_owners(ref self: ContractState, owners: Span<Owner>, threshold: u32) {
            let new_count = owners.len();
            assert(new_count > 0, 'ZERO_OWNERS');
            assert(threshold > 0, 'ZERO_THRESHOLD');
            assert(threshold <= new_count, 'THRESHOLD_TOO_HIGH');

            let mut i: u32 = 0;
            while i < new_count {
                let owner = *owners.at(i);
                assert(owner.address.is_non_zero(), 'ZERO_OWNER_ADDRESS');
                assert(owner.public_key.is_non_zero(), 'ZERO_OWNER_KEY');
                let mut j: u32 = 0;
                while j < i {
                    let other = *owners.at(j);
                    assert(other.address != owner.address, 'DUPLICATE_OWNER_ADDRESS');
                    // Distinct slots sharing a key would let one signer satisfy the threshold
                    // twice, since strictly-increasing indices only stop a slot being reused.
                    assert(other.public_key != owner.public_key, 'DUPLICATE_OWNER_KEY');
                    j += 1;
                };
                self.owners.write(i, owner);
                i += 1;
            };

            let old_count = self.owners_count.read();
            let mut k = new_count;
            while k < old_count {
                self.owners.write(k, Owner { address: Zero::zero(), public_key: 0 });
                k += 1;
            };

            self.owners_count.write(new_count);
            self.threshold.write(threshold);

            let mut i: u32 = 0;
            while i < new_count {
                let owner = *owners.at(i);
                self.emit(
                    OwnerUpdated {
                        owner: owner.address,
                        public_key: owner.public_key,
                        owners_count: new_count,
                        threshold,
                    },
                );
                i += 1;
            };
        }

        /// Verifies that at least `threshold` of the encoded signatures are valid STARK-curve
        /// ECDSA signatures by distinct, in-range owners.
        ///
        /// Each owner signs a SNIP-12 `MultisigApproval` message wrapping `msg_hash`, bound to
        /// that owner's own account address — the form a browser wallet produces. The shared
        /// domain and struct hashes are computed once, outside the loop.
        ///
        /// Signature encoding: `[sig_count, owner_index_0, r_0, s_0, ..., owner_index_{k-1},
        /// r_{k-1}, s_{k-1}]`. Owner indices must be strictly increasing (rejects duplicate-signer
        /// reuse) — a violation of this or the length invariant reverts as malformed input, per
        /// `ICustomSignatureValidation`'s documented contract. A well-formed bundle with too few
        /// cryptographically valid signatures returns `false`, not a revert.
        fn _verify_threshold(
            self: @ContractState, msg_hash: felt252, signature: Span<felt252>,
        ) -> bool {
            let mut signature = signature;
            let count_felt: felt252 = *signature.pop_front().expect('INVALID_SIGNATURE_LEN');
            let sig_count: u32 = count_felt.try_into().expect('INVALID_SIGNATURE_LEN');
            assert(signature.len() == sig_count * 3, 'INVALID_SIGNATURE_LEN');

            let threshold = self.threshold.read();
            let owners_count = self.owners_count.read();
            let ctx = approval_context(get_contract_address(), msg_hash);

            let mut prev_index: Option<u32> = Option::None;
            let mut valid_count: u32 = 0;
            let mut i: u32 = 0;
            while i < sig_count {
                let owner_index_felt: felt252 = *signature.pop_front().unwrap();
                let owner_index: u32 = owner_index_felt
                    .try_into()
                    .expect('INVALID_OWNER_INDEX');
                let r: felt252 = *signature.pop_front().unwrap();
                let s: felt252 = *signature.pop_front().unwrap();

                assert(owner_index < owners_count, 'OWNER_INDEX_OUT_OF_RANGE');
                if let Option::Some(prev) = prev_index {
                    assert(owner_index > prev, 'UNSORTED_OWNER_INDEX');
                }
                prev_index = Option::Some(owner_index);

                let owner = self.owners.read(owner_index);
                let owner_msg = owner_approval_hash(ctx, owner.address);
                if check_ecdsa_signature(owner_msg, owner.public_key, r, s) {
                    valid_count += 1;
                }
                i += 1;
            };

            valid_count >= threshold
        }
    }
}

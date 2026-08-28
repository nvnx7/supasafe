use starknet::ContractAddress;
use crate::multisig_account::{EncryptedViewingKeyInput, Owner};

/// A Supasafe view-key envelope for one multisig owner. The key itself is never stored on-chain.
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct EncryptedViewKey {
    pub ephemeral_pubkey: felt252,
    pub ciphertext: felt252,
}

/// The public half of an owner's Supasafe-specific view-key identity.
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct ViewKeyRegistration {
    pub public_key: felt252,
    pub version: u32,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct MultisigMetadata {
    pub threshold: u32,
    pub owners_count: u32,
    pub viewing_public_key: felt252,
}

#[starknet::interface]
pub trait ISupasafeRegistryFactory<TState> {
    fn register_view_key(ref self: TState, public_key: felt252);
    fn get_view_key(self: @TState, owner: ContractAddress) -> ViewKeyRegistration;
    fn get_encrypted_view_key(
        self: @TState, multisig: ContractAddress, owner: ContractAddress,
    ) -> EncryptedViewKey;
    fn get_multisig_metadata(self: @TState, multisig: ContractAddress) -> MultisigMetadata;
    fn is_supasafe_multisig(self: @TState, multisig: ContractAddress) -> bool;
    fn create_multisig(
        ref self: TState,
        owners: Span<Owner>,
        threshold: u32,
        viewing_public_key: felt252,
        encrypted: Span<EncryptedViewingKeyInput>,
        salt: felt252,
    ) -> ContractAddress;
}

#[starknet::contract]
pub mod SupasafeRegistryFactory {
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::syscalls::deploy_syscall;
    use starknet::{ClassHash, ContractAddress, SyscallResultTrait, get_caller_address};
    use super::{
        EncryptedViewKey, EncryptedViewingKeyInput, ISupasafeRegistryFactory, MultisigMetadata,
        Owner, ViewKeyRegistration,
    };

    #[storage]
    struct Storage {
        multisig_class_hash: ClassHash,
        view_keys: Map<ContractAddress, ViewKeyRegistration>,
        multisigs: Map<ContractAddress, bool>,
        metadata: Map<ContractAddress, MultisigMetadata>,
        encrypted_view_keys: Map<(ContractAddress, ContractAddress), EncryptedViewKey>,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ViewKeyRegistered {
        #[key]
        pub owner: ContractAddress,
        pub public_key: felt252,
        pub version: u32,
    }

    /// One event per owner at multisig creation. Clients filter this known factory address by
    /// `owner` to list Supasafe multisigs without scanning arbitrary contract events.
    #[derive(Drop, starknet::Event)]
    pub struct MultisigOwnerUpdated {
        #[key]
        pub owner: ContractAddress,
        #[key]
        pub multisig: ContractAddress,
        pub public_key: felt252,
        pub owners_count: u32,
        pub threshold: u32,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ViewKeyRegistered: ViewKeyRegistered,
        MultisigOwnerUpdated: MultisigOwnerUpdated,
    }

    #[constructor]
    fn constructor(ref self: ContractState, multisig_class_hash: ClassHash) {
        let class_hash: felt252 = multisig_class_hash.into();
        assert(class_hash != 0, 'ZERO_MULTISIG_CLASS_HASH');
        self.multisig_class_hash.write(multisig_class_hash);
    }

    #[abi(embed_v0)]
    impl SupasafeRegistryFactoryImpl of ISupasafeRegistryFactory<ContractState> {
        fn register_view_key(ref self: ContractState, public_key: felt252) {
            assert(public_key != 0, 'ZERO_VIEW_KEY');

            let owner = get_caller_address();
            let current = self.view_keys.read(owner);
            let version = if current.version == 0 {
                1
            } else {
                current.version + 1
            };
            self.view_keys.write(owner, ViewKeyRegistration { public_key, version });
            self.emit(ViewKeyRegistered { owner, public_key, version });
        }

        fn get_view_key(self: @ContractState, owner: ContractAddress) -> ViewKeyRegistration {
            self.view_keys.read(owner)
        }

        fn get_encrypted_view_key(
            self: @ContractState, multisig: ContractAddress, owner: ContractAddress,
        ) -> EncryptedViewKey {
            self.encrypted_view_keys.read((multisig, owner))
        }

        fn get_multisig_metadata(
            self: @ContractState, multisig: ContractAddress,
        ) -> MultisigMetadata {
            self.metadata.read(multisig)
        }

        fn is_supasafe_multisig(self: @ContractState, multisig: ContractAddress) -> bool {
            self.multisigs.read(multisig)
        }

        fn create_multisig(
            ref self: ContractState,
            owners: Span<Owner>,
            threshold: u32,
            viewing_public_key: felt252,
            encrypted: Span<EncryptedViewingKeyInput>,
            salt: felt252,
        ) -> ContractAddress {
            self._assert_caller_is_owner(owners);
            assert(viewing_public_key != 0, 'ZERO_VIEWING_PUBLIC_KEY');
            assert(encrypted.len() == owners.len(), 'ENCRYPTED_KEYS_COUNT_MISMATCH');
            self._assert_registered_view_keys(owners);

            let mut constructor_calldata = array![];
            owners.serialize(ref constructor_calldata);
            threshold.serialize(ref constructor_calldata);
            viewing_public_key.serialize(ref constructor_calldata);
            encrypted.serialize(ref constructor_calldata);

            let (multisig, _) = deploy_syscall(
                self.multisig_class_hash.read(), salt, constructor_calldata.span(), false,
            )
                .unwrap_syscall();

            self.multisigs.write(multisig, true);
            self._store_encrypted_view_keys(multisig, owners, encrypted);
            self._record_multisig(multisig, owners, threshold, viewing_public_key);
            multisig
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_caller_is_owner(self: @ContractState, owners: Span<Owner>) {
            let caller = get_caller_address();
            let mut is_owner = false;
            for owner in owners {
                let owner = *owner;
                if owner.address == caller {
                    is_owner = true;
                }
            }
            assert(is_owner, 'CALLER_NOT_OWNER');
        }

        fn _assert_registered_view_keys(self: @ContractState, owners: Span<Owner>) {
            for owner in owners {
                let owner = *owner;
                assert(
                    self.view_keys.read(owner.address).public_key != 0, 'OWNER_VIEW_KEY_MISSING',
                );
            };
        }

        fn _store_encrypted_view_keys(
            ref self: ContractState,
            multisig: ContractAddress,
            owners: Span<Owner>,
            encrypted: Span<EncryptedViewingKeyInput>,
        ) {
            let mut index: u32 = 0;
            while index < owners.len() {
                let owner = *owners.at(index);
                let entry = *encrypted.at(index);
                assert(entry.owner == owner.address, 'ENCRYPTED_KEY_OWNER_MISMATCH');
                assert(entry.ephemeral_pubkey != 0, 'ZERO_EPHEMERAL_PUBKEY');
                self
                    .encrypted_view_keys
                    .write(
                        (multisig, owner.address),
                        EncryptedViewKey {
                            ephemeral_pubkey: entry.ephemeral_pubkey, ciphertext: entry.ciphertext,
                        },
                    );
                index += 1;
            };
        }

        fn _record_multisig(
            ref self: ContractState,
            multisig: ContractAddress,
            owners: Span<Owner>,
            threshold: u32,
            viewing_public_key: felt252,
        ) {
            self
                .metadata
                .write(
                    multisig,
                    MultisigMetadata { threshold, owners_count: owners.len(), viewing_public_key },
                );

            let mut index: u32 = 0;
            while index < owners.len() {
                let owner = *owners.at(index);
                self
                    .emit(
                        MultisigOwnerUpdated {
                            owner: owner.address,
                            multisig,
                            public_key: owner.public_key,
                            owners_count: owners.len(),
                            threshold,
                        },
                    );
                index += 1;
            };
        }
    }
}

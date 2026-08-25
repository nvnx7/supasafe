use openzeppelin::account::extensions::src9::snip12_utils::OutsideExecutionStructHash;
use openzeppelin::interfaces::accounts::{ISRC6Dispatcher, ISRC6DispatcherTrait, ISRC6_ID};
use openzeppelin::interfaces::introspection::{ISRC5Dispatcher, ISRC5DispatcherTrait};
use openzeppelin::interfaces::src9::{
    ISRC9_V2Dispatcher, ISRC9_V2DispatcherTrait, ISRC9_V2_ID, OutsideExecution,
};
use openzeppelin::utils::cryptography::snip12::{OffchainMessageHash, SNIP12Metadata};
use snforge_std::{
    EventSpyAssertionsTrait, spy_events, start_cheat_block_timestamp, start_cheat_caller_address,
    start_cheat_signature, start_cheat_transaction_hash, stop_cheat_caller_address,
};
use core::num::traits::Zero;
use starknet::ContractAddress;
use starknet::account::Call;
use supasafe::hashing::compute_call_set_hash;
use supasafe::multisig_account::PrivateMultisigAccount::{
    EncryptedViewingKey, Event, OwnerUpdated,
};
use supasafe::multisig_account::{
    EncryptedViewingKeyInput, ICUSTOM_SIGNATURE_VALIDATION_ID, Owner, ICustomSignatureValidationDispatcher,
    ICustomSignatureValidationDispatcherTrait, IDeployableDispatcher, IDeployableDispatcherTrait,
    IMultisigDispatcher, IMultisigDispatcherTrait,
};
use super::utils::{
    assert_deploy_fails_with, deploy_multisig, deploy_multisig_with_viewing_key, keypair,
    owner_address, owners_of, sample_calls, sign_as, sign_bundle, try_deploy_multisig,
};

/// Mirrors `SRC9Component::SNIP12MetadataImpl` so tests derive the exact hash the
/// contract verifies against.
impl OutsideExecutionMetadata of SNIP12Metadata {
    fn name() -> felt252 {
        'Account.execute_from_outside'
    }
    fn version() -> felt252 {
        2
    }
}

// --- constructor validation ---

#[test]
fn test_constructor_rejects_empty_owner_set() {
    assert_deploy_fails_with(array![].span(), 1, 'ZERO_OWNERS');
}

#[test]
fn test_constructor_rejects_threshold_above_owner_count() {
    let owners = owners_of(array![1].span());
    assert_deploy_fails_with(owners, 2, 'THRESHOLD_TOO_HIGH');
}

#[test]
fn test_constructor_rejects_duplicate_owner_keys() {
    let shared = keypair(1).public_key;
    let owners = array![
        Owner { address: owner_address(1), public_key: shared },
        Owner { address: owner_address(2), public_key: shared },
    ]
        .span();
    assert_deploy_fails_with(owners, 1, 'DUPLICATE_OWNER_KEY');
}

#[test]
fn test_constructor_rejects_duplicate_owner_addresses() {
    let shared = owner_address(1);
    let owners = array![
        Owner { address: shared, public_key: keypair(1).public_key },
        Owner { address: shared, public_key: keypair(2).public_key },
    ]
        .span();
    assert_deploy_fails_with(owners, 1, 'DUPLICATE_OWNER_ADDRESS');
}

#[test]
fn test_constructor_rejects_zero_owner_address() {
    let owners = array![Owner { address: Zero::zero(), public_key: keypair(1).public_key }].span();
    assert_deploy_fails_with(owners, 1, 'ZERO_OWNER_ADDRESS');
}

// --- owner binding ---

/// A signature presented under someone else's owner index must not count. The discriminator
/// here is the key, not the address binding — `_set_owners` forbids duplicate keys, so no two
/// slots can share one. The address binding is a functional requirement (it is what makes a
/// wallet-produced signature verify at all), pinned by `test_owner_approval_hash_is_stable`.
#[test]
fn test_signature_does_not_transfer_between_owner_slots() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 1);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);

    let (r, s) = sign_as(contract_address, 1, msg_hash);
    let dispatcher = ICustomSignatureValidationDispatcher { contract_address };

    // Control: the same signature is accepted at its own index.
    let accepted = dispatcher
        .is_custom_signature_valid(calls_span, additional_data, array![1, 0, r, s].span());
    assert(accepted == starknet::VALIDATED, 'control should be accepted');

    // The bundle now claims owner 0's signature belongs to owner 1.
    let moved = dispatcher
        .is_custom_signature_valid(calls_span, additional_data, array![1, 1, r, s].span());
    assert(moved == 0, 'slot binding not enforced');
}

/// The public key is the authority: keeping an owner's address while replacing their key
/// invalidates signatures made with the old one.
#[test]
fn test_rotated_owner_key_invalidates_old_signature() {
    let owners = owners_of(array![1].span());
    let contract_address = deploy_multisig(owners, 1);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);
    let (r, s) = sign_as(contract_address, 1, msg_hash);

    // Same address, different key.
    let rotated = array![Owner { address: owner_address(1), public_key: keypair(9).public_key }]
        .span();
    start_cheat_caller_address(contract_address, contract_address);
    IMultisigDispatcher { contract_address }.set_owners(rotated, 1);
    stop_cheat_caller_address(contract_address);

    let result = ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, array![1, 0, r, s].span());
    assert(result == 0, 'rotated key should reject');
}

/// Approvals name the multisig inside the signed struct, so an owner shared between two
/// multisigs cannot have their approval on one replayed against the other.
#[test]
fn test_approval_does_not_replay_across_multisigs() {
    let owners = owners_of(array![1, 2].span());
    let first = deploy_multisig(owners, 1);
    let second = deploy_multisig(owners, 1);
    assert(first != second, 'expected distinct multisigs');

    let calls = sample_calls(first);
    let calls_span = calls.span();
    let additional_data = array![].span();

    // Identical call set and message hash; only the multisig the owner approved for differs.
    let msg_hash = compute_call_set_hash(second, calls_span, additional_data);
    let dispatcher = ICustomSignatureValidationDispatcher { contract_address: second };

    // Control: approving for `second` is accepted.
    let (r, s) = sign_as(second, 1, msg_hash);
    let accepted = dispatcher
        .is_custom_signature_valid(calls_span, additional_data, array![1, 0, r, s].span());
    assert(accepted == starknet::VALIDATED, 'control should be accepted');

    // The same owner's approval for `first` must not carry over.
    let (r, s) = sign_as(first, 1, msg_hash);
    let replayed = dispatcher
        .is_custom_signature_valid(calls_span, additional_data, array![1, 0, r, s].span());
    assert(replayed == 0, 'cross-multisig replay');
}

// --- is_custom_signature_valid (STRK20 pool integration path) ---

#[test]
fn test_threshold_met_via_custom_validation() {
    let owners = owners_of(array![1, 2, 3].span());
    let contract_address = deploy_multisig(owners, 2);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);

    let (r0, s0) = sign_as(contract_address, 1, msg_hash);
    let (r2, s2) = sign_as(contract_address, 3, msg_hash);
    let signature = array![2, 0, r0, s0, 2, r2, s2].span();

    let result = ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
    assert(result == starknet::VALIDATED, 'expected VALIDATED');
}

#[test]
fn test_below_threshold_returns_zero_not_revert() {
    let owners = owners_of(array![1, 2, 3].span());
    let contract_address = deploy_multisig(owners, 2);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);

    let (r0, s0) = sign_as(contract_address, 1, msg_hash);
    let signature = array![1, 0, r0, s0].span();

    let result = ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
    assert(result == 0, 'expected soft rejection');
}

#[test]
#[should_panic(expected: 'UNSORTED_OWNER_INDEX')]
fn test_duplicate_owner_index_reverts() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 2);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);
    let (r0, s0) = sign_as(contract_address, 1, msg_hash);
    let signature = array![2, 0, r0, s0, 0, r0, s0].span();

    ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
}

#[test]
#[should_panic(expected: 'OWNER_INDEX_OUT_OF_RANGE')]
fn test_out_of_range_owner_index_reverts() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 1);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);
    let (r0, s0) = sign_as(contract_address, 1, msg_hash);
    let signature = array![1, 5, r0, s0].span();

    ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
}

#[test]
#[should_panic(expected: 'INVALID_SIGNATURE_LEN')]
fn test_malformed_signature_length_reverts() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 1);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    // sig_count says 1 but only (owner_index, r) follow, missing s
    let signature = array![1, 0, 5].span();

    ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, array![].span(), signature);
}

#[test]
fn test_hash_construction_is_deterministic() {
    let signer: ContractAddress = 0x123.try_into().unwrap();
    let calls = sample_calls(signer);
    let calls_span = calls.span();
    let additional_data = array![].span();

    let hash1 = compute_call_set_hash(signer, calls_span, additional_data);
    let hash2 = compute_call_set_hash(signer, calls_span, additional_data);
    assert(hash1 == hash2, 'hash not deterministic');
    assert(hash1 != 0, 'hash should not be zero');
}

// --- SRC5 introspection ---

#[test]
fn test_supports_expected_interfaces() {
    let owners = owners_of(array![1].span());
    let contract_address = deploy_multisig(owners, 1);

    let dispatcher = ISRC5Dispatcher { contract_address };
    assert(dispatcher.supports_interface(ICUSTOM_SIGNATURE_VALIDATION_ID), 'missing custom id');
    assert(dispatcher.supports_interface(ISRC6_ID), 'missing SRC6 id');
}

// --- standard SNIP-6 path (is_valid_signature / __validate__) ---

#[test]
fn test_is_valid_signature_over_arbitrary_hash() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 2);

    let hash: felt252 = 0x1234;
    let (r0, s0) = sign_as(contract_address, 1, hash);
    let (r1, s1) = sign_as(contract_address, 2, hash);
    let signature: Array<felt252> = array![2, 0, r0, s0, 1, r1, s1];

    let result = ISRC6Dispatcher { contract_address }.is_valid_signature(hash, signature);
    assert(result == starknet::VALIDATED, 'expected VALIDATED');
}

#[test]
fn test_validate_entrypoint_with_cheated_tx_context() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 2);

    let tx_hash: felt252 = 0xabc;
    let (r0, s0) = sign_as(contract_address, 1, tx_hash);
    let (r1, s1) = sign_as(contract_address, 2, tx_hash);
    let signature: Array<felt252> = array![2, 0, r0, s0, 1, r1, s1];

    start_cheat_transaction_hash(contract_address, tx_hash);
    start_cheat_signature(contract_address, signature.span());

    let result = ISRC6Dispatcher { contract_address }.__validate__(sample_calls(contract_address));
    assert(result == starknet::VALIDATED, 'expected VALIDATED');
}

// --- owner-set mutability (self-authorized) ---

#[test]
#[should_panic(expected: 'UNAUTHORIZED')]
fn test_set_owners_rejects_external_caller() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 1);
    let new_owners = owners_of(array![3].span());

    IMultisigDispatcher { contract_address }.set_owners(new_owners, 1);
}

#[test]
fn test_set_owners_succeeds_when_called_by_self() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 1);
    let new_owners = owners_of(array![3, 4, 5].span());

    start_cheat_caller_address(contract_address, contract_address);
    IMultisigDispatcher { contract_address }.set_owners(new_owners, 2);
    stop_cheat_caller_address(contract_address);

    let dispatcher = IMultisigDispatcher { contract_address };
    assert(dispatcher.get_threshold() == 2, 'threshold not updated');
    assert(dispatcher.get_owners().len() == 3, 'owners not updated');
}

#[test]
fn test_stale_owner_signature_rejected_after_owner_set_replaced() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 1);

    let new_owners = owners_of(array![3].span());
    start_cheat_caller_address(contract_address, contract_address);
    IMultisigDispatcher { contract_address }.set_owners(new_owners, 1);
    stop_cheat_caller_address(contract_address);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);
    let (r, s) = sign_as(contract_address, 1, msg_hash);
    let signature = array![1, 0, r, s].span();

    let result = ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
    assert(result == 0, 'stale owner should be rejected');
}

// --- OwnerUpdated event ---

#[test]
fn test_constructor_emits_owner_updated_per_owner() {
    let owners = owners_of(array![1, 2].span());

    let mut spy = spy_events();
    let contract_address = deploy_multisig(owners, 2);

    // One event per owner, each carrying the same resulting configuration.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    Event::OwnerUpdated(
                        OwnerUpdated {
                            owner: (*owners.at(0)).address,
                            public_key: (*owners.at(0)).public_key,
                            owners_count: 2,
                            threshold: 2,
                        },
                    ),
                ),
                (
                    contract_address,
                    Event::OwnerUpdated(
                        OwnerUpdated {
                            owner: (*owners.at(1)).address,
                            public_key: (*owners.at(1)).public_key,
                            owners_count: 2,
                            threshold: 2,
                        },
                    ),
                ),
            ],
        );
}

#[test]
fn test_set_owners_emits_owner_updated_per_new_owner() {
    let owners = owners_of(array![1, 2].span());
    let contract_address = deploy_multisig(owners, 2);
    let new_owners = owners_of(array![3, 4, 5].span());

    let mut spy = spy_events();
    start_cheat_caller_address(contract_address, contract_address);
    IMultisigDispatcher { contract_address }.set_owners(new_owners, 3);
    stop_cheat_caller_address(contract_address);

    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    Event::OwnerUpdated(
                        OwnerUpdated {
                            owner: (*new_owners.at(0)).address,
                            public_key: (*new_owners.at(0)).public_key,
                            owners_count: 3,
                            threshold: 3,
                        },
                    ),
                ),
                (
                    contract_address,
                    Event::OwnerUpdated(
                        OwnerUpdated {
                            owner: (*new_owners.at(1)).address,
                            public_key: (*new_owners.at(1)).public_key,
                            owners_count: 3,
                            threshold: 3,
                        },
                    ),
                ),
                (
                    contract_address,
                    Event::OwnerUpdated(
                        OwnerUpdated {
                            owner: (*new_owners.at(2)).address,
                            public_key: (*new_owners.at(2)).public_key,
                            owners_count: 3,
                            threshold: 3,
                        },
                    ),
                ),
            ],
        );

    // The spy starts after deployment, so this asserts specifically that a replaced owner is
    // never re-announced — which is what lets a client treat a missing event as removal.
    spy
        .assert_not_emitted(
            @array![
                (
                    contract_address,
                    Event::OwnerUpdated(
                        OwnerUpdated {
                            owner: (*owners.at(0)).address,
                            public_key: (*owners.at(0)).public_key,
                            owners_count: 3,
                            threshold: 3,
                        },
                    ),
                ),
            ],
        );
}

// --- protocol deploy/declare validation ---

fn deploy_3of2() -> ContractAddress {
    let owners = owners_of(array![1, 2, 3].span());
    deploy_multisig(owners, 2)
}

#[test]
fn test_validate_deploy_accepts_threshold_signature() {
    let contract_address = deploy_3of2();

    let tx_hash: felt252 = 0xde91048;
    let signature = sign_bundle(contract_address, array![(0, 1), (1, 2)].span(), tx_hash);
    start_cheat_transaction_hash(contract_address, tx_hash);
    start_cheat_signature(contract_address, signature.span());

    let result = IDeployableDispatcher { contract_address }
        .__validate_deploy__(0x1234, 0x5678, owners_of(array![1].span()), 1, 0, array![].span());
    assert(result == starknet::VALIDATED, 'expected VALIDATED');
}

#[test]
#[should_panic(expected: 'INVALID_SIGNATURE')]
fn test_validate_deploy_rejects_insufficient_signatures() {
    let contract_address = deploy_3of2();

    let tx_hash: felt252 = 0xde91048;
    // Only 1 of the required 2 owners.
    let signature = sign_bundle(contract_address, array![(0, 1)].span(), tx_hash);
    start_cheat_transaction_hash(contract_address, tx_hash);
    start_cheat_signature(contract_address, signature.span());

    IDeployableDispatcher { contract_address }
        .__validate_deploy__(0x1234, 0x5678, owners_of(array![1].span()), 1, 0, array![].span());
}

#[test]
fn test_validate_declare_accepts_threshold_signature() {
    let contract_address = deploy_3of2();

    let tx_hash: felt252 = 0xdec1a2e;
    let signature = sign_bundle(contract_address, array![(0, 1), (1, 2)].span(), tx_hash);
    start_cheat_transaction_hash(contract_address, tx_hash);
    start_cheat_signature(contract_address, signature.span());

    let result = IDeployableDispatcher { contract_address }.__validate_declare__(0x1234);
    assert(result == starknet::VALIDATED, 'expected VALIDATED');
}

// --- SNIP-9 outside execution (paymaster / relayer path) ---

/// Builds an outside execution that re-points the account at `new_owners`, plus the SNIP-12
/// hash owners must sign. Targeting the account's own `set_owners` proves the relayed call
/// really executes with the account itself as caller.
fn set_owners_outside_execution(
    contract_address: ContractAddress, new_owners: Span<Owner>, threshold: u32, nonce: felt252,
) -> (OutsideExecution, felt252) {
    let mut calldata = array![];
    new_owners.serialize(ref calldata);
    threshold.serialize(ref calldata);

    let outside_execution = OutsideExecution {
        caller: 'ANY_CALLER'.try_into().unwrap(),
        nonce,
        execute_after: 0,
        execute_before: 0xffffffff,
        calls: array![
            Call {
                to: contract_address,
                selector: selector!("set_owners"),
                calldata: calldata.span(),
            },
        ]
            .span(),
    };
    let msg_hash = outside_execution.get_message_hash(contract_address);
    (outside_execution, msg_hash)
}

#[test]
fn test_supports_outside_execution_interface() {
    let owners = owners_of(array![1].span());
    let contract_address = deploy_multisig(owners, 1);

    let dispatcher = ISRC5Dispatcher { contract_address };
    assert(dispatcher.supports_interface(ISRC9_V2_ID), 'missing SRC9 id');
}

#[test]
fn test_execute_from_outside_runs_calls_with_quorum() {
    let contract_address = deploy_3of2();
    start_cheat_block_timestamp(contract_address, 1000);

    let new_owners = owners_of(array![7, 8].span());
    let (outside_execution, msg_hash) = set_owners_outside_execution(
        contract_address, new_owners, 1, 42,
    );
    let signature = sign_bundle(contract_address, array![(0, 1), (1, 2)].span(), msg_hash);

    let dispatcher = ISRC9_V2Dispatcher { contract_address };
    assert(dispatcher.is_valid_outside_execution_nonce(42), 'nonce should start unused');

    dispatcher.execute_from_outside_v2(outside_execution, signature.span());

    let multisig = IMultisigDispatcher { contract_address };
    assert(multisig.get_owners().len() == 2, 'owners not updated');
    assert(multisig.get_threshold() == 1, 'threshold not updated');
    assert(!dispatcher.is_valid_outside_execution_nonce(42), 'nonce should be consumed');
}

#[test]
#[should_panic(expected: 'SRC9: invalid signature')]
fn test_execute_from_outside_rejects_insufficient_signatures() {
    let contract_address = deploy_3of2();
    start_cheat_block_timestamp(contract_address, 1000);

    let new_owners = owners_of(array![7].span());
    let (outside_execution, msg_hash) = set_owners_outside_execution(
        contract_address, new_owners, 1, 42,
    );
    // Only 1 of the required 2 owners.
    let signature = sign_bundle(contract_address, array![(0, 1)].span(), msg_hash);

    ISRC9_V2Dispatcher { contract_address }
        .execute_from_outside_v2(outside_execution, signature.span());
}

#[test]
#[should_panic(expected: 'SRC9: duplicated nonce')]
fn test_execute_from_outside_rejects_replayed_nonce() {
    let contract_address = deploy_3of2();
    start_cheat_block_timestamp(contract_address, 1000);

    // Re-point the account at the same owner set/threshold so the second submission fails
    // on the nonce rather than on a now-stale signer set.
    let owners = owners_of(array![1, 2, 3].span());
    let (outside_execution, msg_hash) = set_owners_outside_execution(
        contract_address, owners, 2, 42,
    );
    let signature = sign_bundle(contract_address, array![(0, 1), (1, 2)].span(), msg_hash);

    let dispatcher = ISRC9_V2Dispatcher { contract_address };
    dispatcher.execute_from_outside_v2(outside_execution, signature.span());
    dispatcher.execute_from_outside_v2(outside_execution, signature.span());
}

// --- approval message format ---

/// Pins the exact SNIP-12 message an owner signs.
///
/// Every other test derives the expected hash from `compute_owner_approval_hash` itself, so a
/// change to the construction would move both sides together and go unnoticed. This vector is
/// the fixed point: it must equal what `web/src/lib/signing.ts` builds, or wallet signatures
/// will not verify on chain.
#[test]
fn test_owner_approval_hash_is_stable() {
    let multisig: ContractAddress = 0x1111.try_into().unwrap();
    let owner: ContractAddress = 0x2222.try_into().unwrap();
    let hash = supasafe::hashing::compute_owner_approval_hash(multisig, owner, 0x3333);
    assert(
        hash == 0x64728c04ece1ac407a0ad712b5a9e4312b0d3e20aca7b9d33f4dc3af66f2f10,
        'approval hash format changed',
    );
}

/// The multisig address and the owner address must each move the hash — the first stops an
/// approval being replayed on another multisig, the second is what lets a wallet signature,
/// which is always bound to the signing account, verify against the right owner.
#[test]
fn test_owner_approval_hash_binds_both_addresses() {
    let multisig: ContractAddress = 0x1111.try_into().unwrap();
    let other_multisig: ContractAddress = 0x1112.try_into().unwrap();
    let owner: ContractAddress = 0x2222.try_into().unwrap();
    let other_owner: ContractAddress = 0x2223.try_into().unwrap();

    let base = supasafe::hashing::compute_owner_approval_hash(multisig, owner, 0x3333);
    assert(
        supasafe::hashing::compute_owner_approval_hash(other_multisig, owner, 0x3333) != base,
        'multisig not bound',
    );
    assert(
        supasafe::hashing::compute_owner_approval_hash(multisig, other_owner, 0x3333) != base,
        'owner not bound',
    );
    assert(
        supasafe::hashing::compute_owner_approval_hash(multisig, owner, 0x3334) != base,
        'payload not bound',
    );
}

// --- encrypted viewing key distribution ---

fn encrypted_for(owner: felt252, ciphertext: felt252) -> EncryptedViewingKeyInput {
    EncryptedViewingKeyInput {
        owner: owner_address(owner), ephemeral_pubkey: 0x1234 + owner, ciphertext,
    }
}

fn expect_encrypted(
    contract_address: ContractAddress, owner: felt252, ciphertext: felt252,
) -> (ContractAddress, Event) {
    (
        contract_address,
        Event::EncryptedViewingKey(
            EncryptedViewingKey {
                owner: owner_address(owner),
                viewing_public_key: 0xfeed,
                ephemeral_pubkey: 0x1234 + owner,
                ciphertext,
            },
        ),
    )
}

#[test]
fn test_constructor_publishes_one_encrypted_viewing_key_per_owner() {
    let owners = owners_of(array![1, 2].span());
    let encrypted = array![encrypted_for(1, 0xaaa), encrypted_for(2, 0xbbb)].span();

    let mut spy = spy_events();
    let contract_address = deploy_multisig_with_viewing_key(owners, 2, 0xfeed, encrypted);

    // Every owner gets the same viewing key, encrypted only to them.
    spy
        .assert_emitted(
            @array![
                expect_encrypted(contract_address, 1, 0xaaa),
                expect_encrypted(contract_address, 2, 0xbbb),
            ],
        );
}

/// The copies live in constructor calldata, and an address is derived from its constructor
/// calldata — so changing a single ciphertext yields a different multisig entirely. That is what
/// lets an owner trust a copy carrying this address without trusting whoever deployed it.
#[test]
fn test_encrypted_viewing_keys_change_the_multisig_address() {
    let owners = owners_of(array![1, 2].span());
    let a = deploy_multisig_with_viewing_key(
        owners, 2, 0xfeed, array![encrypted_for(1, 0xaaa), encrypted_for(2, 0xbbb)].span(),
    );
    let b = deploy_multisig_with_viewing_key(
        owners, 2, 0xfeed, array![encrypted_for(1, 0xbbb), encrypted_for(2, 0xbbb)].span(),
    );
    assert(a != b, 'ciphertext not committed to');
}

/// A multisig cannot be created before every owner has a registered pool viewing key to
/// encrypt to — omitting both fields is rejected, not treated as opting out.
#[test]
fn test_constructor_requires_viewing_key() {
    let owners = owners_of(array![1, 2].span());
    match try_deploy_multisig(owners, 2, 0, array![].span()) {
        Result::Ok(_) => core::panic_with_felt252('expected deploy to fail'),
        Result::Err(data) => assert(*data.at(0) == 'ZERO_VIEWING_PUBLIC_KEY', *data.at(0)),
    }
}

#[test]
fn test_constructor_rejects_encrypted_copy_count_mismatch() {
    let owners = owners_of(array![1, 2].span());
    match try_deploy_multisig(owners, 2, 0xfeed, array![encrypted_for(1, 0xaaa)].span()) {
        Result::Ok(_) => core::panic_with_felt252('expected deploy to fail'),
        Result::Err(data) => assert(*data.at(0) == 'ENCRYPTED_KEYS_COUNT_MISMATCH', *data.at(0)),
    }
}

#[test]
fn test_constructor_rejects_copies_without_viewing_key() {
    let owners = owners_of(array![1, 2].span());
    let encrypted = array![encrypted_for(1, 0xaaa), encrypted_for(2, 0xbbb)].span();
    match try_deploy_multisig(owners, 2, 0, encrypted) {
        Result::Ok(_) => core::panic_with_felt252('expected deploy to fail'),
        Result::Err(data) => assert(*data.at(0) == 'ZERO_VIEWING_PUBLIC_KEY', *data.at(0)),
    }
}

#[test]
fn test_constructor_rejects_encrypted_key_for_non_owner() {
    let owners = owners_of(array![1, 2].span());
    // Second entry names an address that isn't owners[1].
    let encrypted = array![encrypted_for(1, 0xaaa), encrypted_for(99, 0xbbb)].span();
    match try_deploy_multisig(owners, 2, 0xfeed, encrypted) {
        Result::Ok(_) => core::panic_with_felt252('expected deploy to fail'),
        Result::Err(data) => assert(*data.at(0) == 'ENCRYPTED_KEY_OWNER_MISMATCH', *data.at(0)),
    }
}

#[test]
fn test_constructor_rejects_out_of_order_encrypted_copies() {
    let owners = owners_of(array![1, 2].span());
    // Right owners, wrong order — the check zips positionally against `owners`.
    let encrypted = array![encrypted_for(2, 0xbbb), encrypted_for(1, 0xaaa)].span();
    match try_deploy_multisig(owners, 2, 0xfeed, encrypted) {
        Result::Ok(_) => core::panic_with_felt252('expected deploy to fail'),
        Result::Err(data) => assert(*data.at(0) == 'ENCRYPTED_KEY_OWNER_MISMATCH', *data.at(0)),
    }
}

#[test]
fn test_constructor_rejects_zero_ephemeral_pubkey() {
    let owners = owners_of(array![1, 2].span());
    let bad = EncryptedViewingKeyInput {
        owner: owner_address(2), ephemeral_pubkey: 0, ciphertext: 0xaaa,
    };
    let encrypted = array![encrypted_for(1, 0xaaa), bad].span();
    match try_deploy_multisig(owners, 2, 0xfeed, encrypted) {
        Result::Ok(_) => core::panic_with_felt252('expected deploy to fail'),
        Result::Err(data) => assert(*data.at(0) == 'ZERO_EPHEMERAL_PUBKEY', *data.at(0)),
    }
}

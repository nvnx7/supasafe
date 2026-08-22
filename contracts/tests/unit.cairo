use openzeppelin::interfaces::accounts::{ISRC6Dispatcher, ISRC6DispatcherTrait, ISRC6_ID};
use openzeppelin::interfaces::introspection::{ISRC5Dispatcher, ISRC5DispatcherTrait};
use snforge_std::signature::SignerTrait;
use snforge_std::signature::stark_curve::StarkCurveSignerImpl;
use snforge_std::{
    start_cheat_caller_address, start_cheat_signature, start_cheat_transaction_hash,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use supersafe::hashing::compute_call_set_hash;
use supersafe::multisig_account::{
    ICUSTOM_SIGNATURE_VALIDATION_ID, ICustomSignatureValidationDispatcher,
    ICustomSignatureValidationDispatcherTrait, IMultisigDispatcher, IMultisigDispatcherTrait,
};
use super::utils::{assert_deploy_fails_with, deploy_multisig, keypair, sample_calls};

// --- constructor validation ---

#[test]
fn test_constructor_rejects_empty_owner_set() {
    assert_deploy_fails_with(array![].span(), 1, 'ZERO_OWNERS');
}

#[test]
fn test_constructor_rejects_threshold_above_owner_count() {
    let owners = array![keypair(1).public_key].span();
    assert_deploy_fails_with(owners, 2, 'THRESHOLD_TOO_HIGH');
}

#[test]
fn test_constructor_rejects_duplicate_owner_keys() {
    let kp = keypair(1);
    let owners = array![kp.public_key, kp.public_key].span();
    assert_deploy_fails_with(owners, 1, 'DUPLICATE_OWNER_KEY');
}

// --- is_custom_signature_valid (STRK20 pool integration path) ---

#[test]
fn test_threshold_met_via_custom_validation() {
    let kp0 = keypair(1);
    let kp1 = keypair(2);
    let kp2 = keypair(3);
    let owners = array![kp0.public_key, kp1.public_key, kp2.public_key].span();
    let contract_address = deploy_multisig(owners, 2);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);

    let (r0, s0) = kp0.sign(msg_hash).unwrap();
    let (r2, s2) = kp2.sign(msg_hash).unwrap();
    let signature = array![2, 0, r0, s0, 2, r2, s2].span();

    let result = ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
    assert(result == starknet::VALIDATED, 'expected VALIDATED');
}

#[test]
fn test_below_threshold_returns_zero_not_revert() {
    let kp0 = keypair(1);
    let owners = array![kp0.public_key, keypair(2).public_key, keypair(3).public_key].span();
    let contract_address = deploy_multisig(owners, 2);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);

    let (r0, s0) = kp0.sign(msg_hash).unwrap();
    let signature = array![1, 0, r0, s0].span();

    let result = ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
    assert(result == 0, 'expected soft rejection');
}

#[test]
#[should_panic(expected: 'UNSORTED_OWNER_INDEX')]
fn test_duplicate_owner_index_reverts() {
    let kp0 = keypair(1);
    let owners = array![kp0.public_key, keypair(2).public_key].span();
    let contract_address = deploy_multisig(owners, 2);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);
    let (r0, s0) = kp0.sign(msg_hash).unwrap();
    let signature = array![2, 0, r0, s0, 0, r0, s0].span();

    ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
}

#[test]
#[should_panic(expected: 'OWNER_INDEX_OUT_OF_RANGE')]
fn test_out_of_range_owner_index_reverts() {
    let kp0 = keypair(1);
    let owners = array![kp0.public_key, keypair(2).public_key].span();
    let contract_address = deploy_multisig(owners, 1);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);
    let (r0, s0) = kp0.sign(msg_hash).unwrap();
    let signature = array![1, 5, r0, s0].span();

    ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
}

#[test]
#[should_panic(expected: 'INVALID_SIGNATURE_LEN')]
fn test_malformed_signature_length_reverts() {
    let owners = array![keypair(1).public_key, keypair(2).public_key].span();
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
    let owners = array![keypair(1).public_key].span();
    let contract_address = deploy_multisig(owners, 1);

    let dispatcher = ISRC5Dispatcher { contract_address };
    assert(dispatcher.supports_interface(ICUSTOM_SIGNATURE_VALIDATION_ID), 'missing custom id');
    assert(dispatcher.supports_interface(ISRC6_ID), 'missing SRC6 id');
}

// --- standard SNIP-6 path (is_valid_signature / __validate__) ---

#[test]
fn test_is_valid_signature_over_arbitrary_hash() {
    let kp0 = keypair(1);
    let kp1 = keypair(2);
    let owners = array![kp0.public_key, kp1.public_key].span();
    let contract_address = deploy_multisig(owners, 2);

    let hash: felt252 = 0x1234;
    let (r0, s0) = kp0.sign(hash).unwrap();
    let (r1, s1) = kp1.sign(hash).unwrap();
    let signature: Array<felt252> = array![2, 0, r0, s0, 1, r1, s1];

    let result = ISRC6Dispatcher { contract_address }.is_valid_signature(hash, signature);
    assert(result == starknet::VALIDATED, 'expected VALIDATED');
}

#[test]
fn test_validate_entrypoint_with_cheated_tx_context() {
    let kp0 = keypair(1);
    let kp1 = keypair(2);
    let owners = array![kp0.public_key, kp1.public_key].span();
    let contract_address = deploy_multisig(owners, 2);

    let tx_hash: felt252 = 0xabc;
    let (r0, s0) = kp0.sign(tx_hash).unwrap();
    let (r1, s1) = kp1.sign(tx_hash).unwrap();
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
    let owners = array![keypair(1).public_key, keypair(2).public_key].span();
    let contract_address = deploy_multisig(owners, 1);
    let new_owners = array![keypair(3).public_key].span();

    IMultisigDispatcher { contract_address }.set_owners(new_owners, 1);
}

#[test]
fn test_set_owners_succeeds_when_called_by_self() {
    let owners = array![keypair(1).public_key, keypair(2).public_key].span();
    let contract_address = deploy_multisig(owners, 1);
    let new_owners = array![
        keypair(3).public_key, keypair(4).public_key, keypair(5).public_key,
    ]
        .span();

    start_cheat_caller_address(contract_address, contract_address);
    IMultisigDispatcher { contract_address }.set_owners(new_owners, 2);
    stop_cheat_caller_address(contract_address);

    let dispatcher = IMultisigDispatcher { contract_address };
    assert(dispatcher.get_threshold() == 2, 'threshold not updated');
    assert(dispatcher.get_owners().len() == 3, 'owners not updated');
}

#[test]
fn test_stale_owner_signature_rejected_after_owner_set_replaced() {
    let kp1 = keypair(1);
    let owners = array![kp1.public_key, keypair(2).public_key].span();
    let contract_address = deploy_multisig(owners, 1);

    let new_owners = array![keypair(3).public_key].span();
    start_cheat_caller_address(contract_address, contract_address);
    IMultisigDispatcher { contract_address }.set_owners(new_owners, 1);
    stop_cheat_caller_address(contract_address);

    let calls = sample_calls(contract_address);
    let calls_span = calls.span();
    let additional_data = array![].span();
    let msg_hash = compute_call_set_hash(contract_address, calls_span, additional_data);
    let (r, s) = kp1.sign(msg_hash).unwrap();
    let signature = array![1, 0, r, s].span();

    let result = ICustomSignatureValidationDispatcher { contract_address }
        .is_custom_signature_valid(calls_span, additional_data, signature);
    assert(result == 0, 'stale owner should be rejected');
}

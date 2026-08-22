use privacy::actions::{ClientAction, SetViewingKeyInput};
use privacy::errors::INVALID_SIGNATURE;
use privacy::interface::{
    IClientDispatcher, IClientDispatcherTrait, IClientSafeDispatcher, IClientSafeDispatcherTrait,
    IViewsDispatcher, IViewsDispatcherTrait,
};
use snforge_std::signature::SignerTrait;
use snforge_std::signature::stark_curve::StarkCurveSignerImpl;
use snforge_std::{start_cheat_caller_address, start_cheat_signature};
use starknet::ContractAddress;
use supersafe::hashing::compute_call_set_hash;
use super::utils::{deploy_multisig, deploy_privacy, keypair, wrap_call};

#[test]
fn test_deploy_privacy_pool_smoke() {
    let governance_admin: ContractAddress = 1.try_into().unwrap();
    let privacy_address = deploy_privacy(governance_admin, 111, 222, 1000);

    let version = IViewsDispatcher { contract_address: privacy_address }.get_version();
    assert(version == '2.0', 'unexpected version');
}

#[test]
fn test_privacy_pool_accepts_multisig_with_valid_threshold_signature() {
    let kp0 = keypair(1);
    let kp1 = keypair(2);
    let kp2 = keypair(3);
    let owners = array![kp0.public_key, kp1.public_key, kp2.public_key].span();
    let multisig_address = deploy_multisig(owners, 2);

    let governance_admin: ContractAddress = 1.try_into().unwrap();
    let privacy_address = deploy_privacy(governance_admin, 111, 222, 1000);

    let client_actions = array![ClientAction::SetViewingKey(SetViewingKeyInput { random: 42 })]
        .span();
    let calls = wrap_call(privacy_address, multisig_address, 999, client_actions);
    let calls_span = calls.span();

    let msg_hash = compute_call_set_hash(multisig_address, calls_span, array![].span());
    let (r0, s0) = kp0.sign(msg_hash).unwrap();
    let (r2, s2) = kp2.sign(msg_hash).unwrap();
    let signature = array![2, 0, r0, s0, 2, r2, s2];

    start_cheat_caller_address(privacy_address, 0.try_into().unwrap());
    start_cheat_signature(privacy_address, signature.span());

    IClientDispatcher { contract_address: privacy_address }.__execute__(calls);
}

#[test]
#[feature("safe_dispatcher")]
fn test_privacy_pool_rejects_multisig_with_insufficient_signatures() {
    let kp0 = keypair(1);
    let kp1 = keypair(2);
    let kp2 = keypair(3);
    let owners = array![kp0.public_key, kp1.public_key, kp2.public_key].span();
    let multisig_address = deploy_multisig(owners, 2);

    let governance_admin: ContractAddress = 1.try_into().unwrap();
    let privacy_address = deploy_privacy(governance_admin, 111, 222, 1000);

    let client_actions = array![ClientAction::SetViewingKey(SetViewingKeyInput { random: 42 })]
        .span();
    let calls = wrap_call(privacy_address, multisig_address, 999, client_actions);
    let calls_span = calls.span();

    let msg_hash = compute_call_set_hash(multisig_address, calls_span, array![].span());
    let (r0, s0) = kp0.sign(msg_hash).unwrap();
    // Only 1 of the required 2 signatures.
    let signature = array![1, 0, r0, s0];

    start_cheat_caller_address(privacy_address, 0.try_into().unwrap());
    start_cheat_signature(privacy_address, signature.span());

    let safe_dispatcher = IClientSafeDispatcher { contract_address: privacy_address };
    match safe_dispatcher.__execute__(calls) {
        Result::Ok(_) => core::panic_with_felt252('expected rejection'),
        Result::Err(panic_data) => assert(*panic_data.at(0) == INVALID_SIGNATURE, *panic_data.at(0)),
    }
}

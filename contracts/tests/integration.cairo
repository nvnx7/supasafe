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
use supasafe::hashing::compute_call_set_hash;
use super::utils::{deploy_multisig, deploy_privacy, owners_of, sign_as, wrap_call};

#[test]
fn test_deploy_privacy_pool_smoke() {
    let governance_admin: ContractAddress = 1.try_into().unwrap();
    let privacy_address = deploy_privacy(governance_admin, 111, 222, 1000);

    let version = IViewsDispatcher { contract_address: privacy_address }.get_version();
    assert(version == '2.0', 'unexpected version');
}

#[test]
fn test_privacy_pool_accepts_multisig_with_valid_threshold_signature() {
    let owners = owners_of(array![1, 2, 3].span());
    let multisig_address = deploy_multisig(owners, 2);

    let governance_admin: ContractAddress = 1.try_into().unwrap();
    let privacy_address = deploy_privacy(governance_admin, 111, 222, 1000);

    let client_actions = array![ClientAction::SetViewingKey(SetViewingKeyInput { random: 42 })]
        .span();
    let calls = wrap_call(privacy_address, multisig_address, 999, client_actions);
    let calls_span = calls.span();

    let msg_hash = compute_call_set_hash(multisig_address, calls_span, array![].span());
    let (r0, s0) = sign_as(multisig_address, 1, msg_hash);
    let (r2, s2) = sign_as(multisig_address, 3, msg_hash);
    let signature = array![2, 0, r0, s0, 2, r2, s2];

    start_cheat_caller_address(privacy_address, 0.try_into().unwrap());
    start_cheat_signature(privacy_address, signature.span());

    IClientDispatcher { contract_address: privacy_address }.__execute__(calls);
}

#[test]
#[feature("safe_dispatcher")]
fn test_privacy_pool_rejects_multisig_with_insufficient_signatures() {
    let owners = owners_of(array![1, 2, 3].span());
    let multisig_address = deploy_multisig(owners, 2);

    let governance_admin: ContractAddress = 1.try_into().unwrap();
    let privacy_address = deploy_privacy(governance_admin, 111, 222, 1000);

    let client_actions = array![ClientAction::SetViewingKey(SetViewingKeyInput { random: 42 })]
        .span();
    let calls = wrap_call(privacy_address, multisig_address, 999, client_actions);
    let calls_span = calls.span();

    let msg_hash = compute_call_set_hash(multisig_address, calls_span, array![].span());
    let (r0, s0) = sign_as(multisig_address, 1, msg_hash);
    // Only 1 of the required 2 signatures.
    let signature = array![1, 0, r0, s0];

    start_cheat_caller_address(privacy_address, 0.try_into().unwrap());
    start_cheat_signature(privacy_address, signature.span());

    let safe_dispatcher = IClientSafeDispatcher { contract_address: privacy_address };
    match safe_dispatcher.__execute__(calls) {
        Result::Ok(_) => core::panic_with_felt252('expected rejection'),
        Result::Err(panic_data) => assert(
            *panic_data.at(0) == INVALID_SIGNATURE, *panic_data.at(0),
        ),
    }
}

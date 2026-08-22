use privacy::actions::ClientAction;
use snforge_std::signature::stark_curve::{StarkCurveKeyPair, StarkCurveKeyPairImpl};
use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
use starknet::ContractAddress;
use starknet::account::Call;

pub fn keypair(secret: felt252) -> StarkCurveKeyPair {
    StarkCurveKeyPairImpl::from_secret_key(secret)
}

pub fn deploy_multisig(owners: Span<felt252>, threshold: u32) -> ContractAddress {
    let (contract_address, _) = try_deploy_multisig(owners, threshold).unwrap();
    contract_address
}

pub fn try_deploy_multisig(
    owners: Span<felt252>, threshold: u32,
) -> Result<(ContractAddress, Span<felt252>), Array<felt252>> {
    let contract = declare("PrivateMultisigAccount").unwrap().contract_class();
    let mut calldata = array![];
    owners.serialize(ref calldata);
    threshold.serialize(ref calldata);
    contract.deploy(@calldata)
}

pub fn assert_deploy_fails_with(owners: Span<felt252>, threshold: u32, expected: felt252) {
    match try_deploy_multisig(owners, threshold) {
        Result::Ok(_) => core::panic_with_felt252('expected deploy to fail'),
        Result::Err(panic_data) => assert(*panic_data.at(0) == expected, *panic_data.at(0)),
    }
}

pub fn sample_calls(to: ContractAddress) -> Array<Call> {
    array![Call { to, selector: selector!("noop"), calldata: array![].span() }]
}

pub fn deploy_privacy(
    governance_admin: ContractAddress,
    auditor_secret: felt252,
    screener_secret: felt252,
    proof_validity_blocks: u64,
) -> ContractAddress {
    let auditor_public_key = StarkCurveKeyPairImpl::from_secret_key(auditor_secret).public_key;
    let screener_public_key = StarkCurveKeyPairImpl::from_secret_key(screener_secret).public_key;

    let contract = declare("Privacy").unwrap().contract_class();
    let mut calldata = array![];
    governance_admin.serialize(ref calldata);
    auditor_public_key.serialize(ref calldata);
    screener_public_key.serialize(ref calldata);
    proof_validity_blocks.serialize(ref calldata);
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

/// Builds the single-element wrapper `Call` the Privacy pool's `__execute__` requires: it must
/// target the pool itself, selector `compile_actions`, calldata `(user_addr, user_private_key,
/// client_actions)`.
pub fn wrap_call(
    privacy_address: ContractAddress,
    user_addr: ContractAddress,
    user_private_key: felt252,
    client_actions: Span<ClientAction>,
) -> Array<Call> {
    let mut calldata = array![];
    user_addr.serialize(ref calldata);
    user_private_key.serialize(ref calldata);
    client_actions.serialize(ref calldata);
    array![
        Call {
            to: privacy_address, selector: selector!("compile_actions"), calldata: calldata.span(),
        },
    ]
}

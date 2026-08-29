use privacy::actions::ClientAction;
use snforge_std::signature::SignerTrait;
use snforge_std::signature::stark_curve::{
    StarkCurveKeyPair, StarkCurveKeyPairImpl, StarkCurveSignerImpl,
};
use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
use starknet::ContractAddress;
use starknet::account::Call;
use supasafe::hashing::compute_owner_approval_hash;
use supasafe::multisig_account::{EncryptedViewingKeyInput, Owner};

pub fn keypair(secret: felt252) -> StarkCurveKeyPair {
    StarkCurveKeyPairImpl::from_secret_key(secret)
}

/// A test owner's account address. Deliberately unrelated to its key, so no test can pass by
/// accidentally relying on a relationship the contract does not enforce.
pub fn owner_address(secret: felt252) -> ContractAddress {
    (secret + 0x8000).try_into().unwrap()
}

/// The deterministic owner derived from `secret`, signed for by `keypair(secret)`.
pub fn owner_of(secret: felt252) -> Owner {
    Owner { address: owner_address(secret), public_key: keypair(secret).public_key }
}

pub fn owners_of(secrets: Span<felt252>) -> Span<Owner> {
    let mut owners = array![];
    for secret in secrets {
        owners.append(owner_of(*secret));
    }
    owners.span()
}

/// Packs owner signatures into this account's bundle encoding:
/// `[sig_count, owner_index_0, r_0, s_0, ...]`.
///
/// `signers` are `(owner_index, secret)` pairs and must be in strictly increasing index order —
/// the contract rejects anything else as malformed. Each secret signs the SNIP-12
/// `MultisigApproval` message wrapping `msg_hash` and bound to that owner's own address, which
/// is the form a wallet produces and the only form `_verify_threshold` accepts.
pub fn sign_bundle(
    multisig: ContractAddress, signers: Span<(u32, felt252)>, msg_hash: felt252,
) -> Array<felt252> {
    let mut signature = array![signers.len().into()];
    for signer in signers {
        let (owner_index, secret) = *signer;
        let owner_msg = compute_owner_approval_hash(multisig, owner_address(secret), msg_hash);
        let (r, s) = keypair(secret).sign(owner_msg).unwrap();
        signature.append(owner_index.into());
        signature.append(r);
        signature.append(s);
    }
    signature
}

/// One owner's `(r, s)` over the approval message, for tests that assemble a bundle by hand.
pub fn sign_as(
    multisig: ContractAddress, secret: felt252, msg_hash: felt252,
) -> (felt252, felt252) {
    let owner_msg = compute_owner_approval_hash(multisig, owner_address(secret), msg_hash);
    keypair(secret).sign(owner_msg).unwrap()
}

/// The public key doesn't need to be a real ECDH key for any test outside the encrypted-viewing-
/// key suite, which builds its own; it only needs to be non-zero.
const DEFAULT_VIEWING_PUBLIC_KEY: felt252 = 0xfeed;

/// One encrypted-viewing-key entry per owner, in owner order, satisfying the constructor's
/// required-field checks without asserting anything about their content.
pub fn default_encrypted_viewing_keys(owners: Span<Owner>) -> Span<EncryptedViewingKeyInput> {
    let mut encrypted = array![];
    let mut i: u32 = 0;
    while i < owners.len() {
        let owner = *owners.at(i);
        encrypted
            .append(
                EncryptedViewingKeyInput {
                    owner: owner.address,
                    ephemeral_pubkey: 0x1234 + i.into() + 1,
                    ciphertext: 0xaaa + i.into(),
                },
            );
        i += 1;
    }
    encrypted.span()
}

/// Deploys with a synthesized viewing key so tests unrelated to that feature don't have to build
/// one by hand; anything exercising the feature itself should call
/// `deploy_multisig_with_viewing_key` directly.
pub fn deploy_multisig(owners: Span<Owner>, threshold: u32) -> ContractAddress {
    deploy_multisig_with_viewing_key(
        owners, threshold, DEFAULT_VIEWING_PUBLIC_KEY, default_encrypted_viewing_keys(owners),
    )
}

pub fn deploy_multisig_with_viewing_key(
    owners: Span<Owner>,
    threshold: u32,
    viewing_public_key: felt252,
    encrypted: Span<EncryptedViewingKeyInput>,
) -> ContractAddress {
    let (contract_address, _) = try_deploy_multisig(
        owners, threshold, viewing_public_key, encrypted,
    )
        .unwrap();
    contract_address
}

pub fn try_deploy_multisig(
    owners: Span<Owner>,
    threshold: u32,
    viewing_public_key: felt252,
    encrypted: Span<EncryptedViewingKeyInput>,
) -> Result<(ContractAddress, Span<felt252>), Array<felt252>> {
    let contract = declare("PrivateMultisigAccount").unwrap().contract_class();
    let mut calldata = array![];
    owners.serialize(ref calldata);
    threshold.serialize(ref calldata);
    viewing_public_key.serialize(ref calldata);
    encrypted.serialize(ref calldata);
    contract.deploy(@calldata)
}

pub fn assert_deploy_fails_with(owners: Span<Owner>, threshold: u32, expected: felt252) {
    match try_deploy_multisig(owners, threshold, 0, array![].span()) {
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

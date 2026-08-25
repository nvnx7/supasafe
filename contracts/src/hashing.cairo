use core::hash::{HashStateExTrait, HashStateTrait};
use core::poseidon::{PoseidonTrait, poseidon_hash_span};
use openzeppelin::account::extensions::src9::snip12_utils::CallStructHash;
use openzeppelin::utils::cryptography::snip12::{StarknetDomain, StructHash};
use starknet::account::Call;
use starknet::{ContractAddress, get_tx_info};

const CALL_SET_SNIP12_NAME: felt252 = 'CallSet';
const CALL_SET_SNIP12_VERSION: felt252 = 1;

const CALL_SET_TYPE_HASH: felt252 = selector!(
    "\"CallSet\"(\"Calls\":\"Call*\",\"AdditionalData\":\"felt*\")\"Call\"(\"To\":\"ContractAddress\",\"Selector\":\"selector\",\"Calldata\":\"felt*\")",
);

#[derive(Drop)]
struct CallSet {
    calls: Span<Call>,
    additional_data: Span<felt252>,
}

impl CallSetStructHashImpl of StructHash<CallSet> {
    fn hash_struct(self: @CallSet) -> felt252 {
        let mut hashed_calls = array![];
        for call in *self.calls {
            hashed_calls.append(call.hash_struct());
        }
        PoseidonTrait::new()
            .update_with(CALL_SET_TYPE_HASH)
            .update_with(poseidon_hash_span(hashed_calls.span()))
            .update_with(poseidon_hash_span(*self.additional_data))
            .finalize()
    }
}

/// SNIP-12 message hash for a `CallSet` authorized by `signer` (the multisig's own address).
/// Byte-identical construction to the STRK20 privacy pool's own `compute_call_set_hash`
/// (`packages/privacy/src/snip12.cairo`), so a signature over this hash also validates on the
/// pool's legacy SNIP-6 fallback path, not just the custom-validation path.
pub fn compute_call_set_hash(
    signer: ContractAddress, calls: Span<Call>, additional_data: Span<felt252>,
) -> felt252 {
    let domain = StarknetDomain {
        name: CALL_SET_SNIP12_NAME,
        version: CALL_SET_SNIP12_VERSION,
        chain_id: get_tx_info().unbox().chain_id,
        revision: 1,
    };
    let struct_hash = CallSet { calls, additional_data }.hash_struct();
    let signer_felt: felt252 = signer.into();
    PoseidonTrait::new()
        .update_with('StarkNet Message')
        .update_with(domain.hash_struct())
        .update_with(signer_felt)
        .update_with(struct_hash)
        .finalize()
}

const MULTISIG_APPROVAL_SNIP12_NAME: felt252 = 'SupaSafe';
const MULTISIG_APPROVAL_SNIP12_VERSION: felt252 = 1;

const MULTISIG_APPROVAL_TYPE_HASH: felt252 = selector!(
    "\"MultisigApproval\"(\"Multisig\":\"ContractAddress\",\"Hash\":\"felt\")",
);

#[derive(Drop)]
struct MultisigApproval {
    multisig: ContractAddress,
    hash: felt252,
}

impl MultisigApprovalStructHashImpl of StructHash<MultisigApproval> {
    fn hash_struct(self: @MultisigApproval) -> felt252 {
        let multisig: felt252 = (*self.multisig).into();
        PoseidonTrait::new()
            .update_with(MULTISIG_APPROVAL_TYPE_HASH)
            .update_with(multisig)
            .update_with(*self.hash)
            .finalize()
    }
}

/// The parts of an owner approval message that every owner of one multisig shares, hashed once
/// so the verification loop pays for them a single time rather than per signature.
#[derive(Copy, Drop)]
pub struct ApprovalContext {
    domain_hash: felt252,
    struct_hash: felt252,
}

pub fn approval_context(multisig: ContractAddress, msg_hash: felt252) -> ApprovalContext {
    let domain = StarknetDomain {
        name: MULTISIG_APPROVAL_SNIP12_NAME,
        version: MULTISIG_APPROVAL_SNIP12_VERSION,
        chain_id: get_tx_info().unbox().chain_id,
        revision: 1,
    };
    ApprovalContext {
        domain_hash: domain.hash_struct(),
        struct_hash: MultisigApproval { multisig, hash: msg_hash }.hash_struct(),
    }
}

/// Completes the SNIP-12 message a single owner signs.
///
/// `owner` is that owner's own account address, because a wallet signing typed data binds the
/// message to the account doing the signing — it cannot produce a hash bound to the multisig.
/// The multisig address is instead carried inside the struct, so an approval of `msg_hash` on
/// one multisig cannot be replayed on another the same owner belongs to.
pub fn owner_approval_hash(ctx: ApprovalContext, owner: ContractAddress) -> felt252 {
    let owner_felt: felt252 = owner.into();
    PoseidonTrait::new()
        .update_with('StarkNet Message')
        .update_with(ctx.domain_hash)
        .update_with(owner_felt)
        .update_with(ctx.struct_hash)
        .finalize()
}

/// One-shot form for callers outside the verification loop.
pub fn compute_owner_approval_hash(
    multisig: ContractAddress, owner: ContractAddress, msg_hash: felt252,
) -> felt252 {
    owner_approval_hash(approval_context(multisig, msg_hash), owner)
}

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

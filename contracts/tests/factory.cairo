use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use supasafe::supasafe_factory::{
    ISupasafeRegistryFactoryDispatcher, ISupasafeRegistryFactoryDispatcherTrait,
};
use super::utils::{default_encrypted_viewing_keys, owner_address, owners_of};

fn deploy_factory() -> ContractAddress {
    let multisig_class_hash = *declare("PrivateMultisigAccount")
        .unwrap()
        .contract_class()
        .class_hash;
    let factory_class = declare("SupasafeRegistryFactory").unwrap().contract_class();
    let mut calldata = array![];
    multisig_class_hash.serialize(ref calldata);
    let (factory, _) = factory_class.deploy(@calldata).unwrap();
    factory
}

fn register_view_key(factory: ContractAddress, owner_secret: felt252, public_key: felt252) {
    start_cheat_caller_address(factory, owner_address(owner_secret));
    ISupasafeRegistryFactoryDispatcher { contract_address: factory }.register_view_key(public_key);
    stop_cheat_caller_address(factory);
}

#[test]
fn test_registers_and_versions_owner_view_keys() {
    let factory = deploy_factory();

    register_view_key(factory, 1, 0x111);
    let dispatcher = ISupasafeRegistryFactoryDispatcher { contract_address: factory };
    let first = dispatcher.get_view_key(owner_address(1));
    assert(first.public_key == 0x111, 'wrong public key');
    assert(first.version == 1, 'wrong initial version');

    register_view_key(factory, 1, 0x222);
    let second = dispatcher.get_view_key(owner_address(1));
    assert(second.public_key == 0x222, 'updated public key missing');
    assert(second.version == 2, 'wrong updated version');
}

#[test]
fn test_deploys_and_indexes_a_multisig_for_every_owner() {
    let factory = deploy_factory();
    let owners = owners_of(array![1, 2].span());
    register_view_key(factory, 1, 0x111);
    register_view_key(factory, 2, 0x222);

    let encrypted = default_encrypted_viewing_keys(owners);
    start_cheat_caller_address(factory, owner_address(1));
    let multisig = ISupasafeRegistryFactoryDispatcher { contract_address: factory }
        .create_multisig(owners, 1, 0xfeed, encrypted, 0x1234);
    stop_cheat_caller_address(factory);

    let dispatcher = ISupasafeRegistryFactoryDispatcher { contract_address: factory };
    assert(dispatcher.is_supasafe_multisig(multisig), 'multisig not registered');

    let metadata = dispatcher.get_multisig_metadata(multisig);
    assert(metadata.threshold == 1, 'wrong threshold');
    assert(metadata.owners_count == 2, 'wrong owner count');
    assert(metadata.viewing_public_key == 0xfeed, 'wrong viewing public key');

    let first = dispatcher.get_encrypted_view_key(multisig, owner_address(1));
    assert(first.ephemeral_pubkey == 0x1235, 'wrong first ephemeral pubkey');
    assert(first.ciphertext == 0xaaa, 'wrong first ciphertext');
    let second = dispatcher.get_encrypted_view_key(multisig, owner_address(2));
    assert(second.ephemeral_pubkey == 0x1236, 'wrong second ephemeral pubkey');
    assert(second.ciphertext == 0xaab, 'wrong second ciphertext');
}

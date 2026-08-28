export const SupasafeRegistryFactoryABI = [
  {
    type: "struct",
    name: "supasafe::supasafe_factory::ViewKeyRegistration",
    members: [
      { name: "public_key", type: "core::felt252" },
      { name: "version", type: "core::integer::u32" },
    ],
  },
  {
    type: "struct",
    name: "supasafe::supasafe_factory::EncryptedViewKey",
    members: [
      { name: "ephemeral_pubkey", type: "core::felt252" },
      { name: "ciphertext", type: "core::felt252" },
    ],
  },
  {
    type: "struct",
    name: "supasafe::supasafe_factory::MultisigMetadata",
    members: [
      { name: "threshold", type: "core::integer::u32" },
      { name: "owners_count", type: "core::integer::u32" },
      { name: "viewing_public_key", type: "core::felt252" },
    ],
  },
  {
    type: "struct",
    name: "supasafe::multisig_account::Owner",
    members: [
      {
        name: "address",
        type: "core::starknet::contract_address::ContractAddress",
      },
      { name: "public_key", type: "core::felt252" },
    ],
  },
  {
    type: "struct",
    name: "core::array::Span::<supasafe::multisig_account::Owner>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<supasafe::multisig_account::Owner>",
      },
    ],
  },
  {
    type: "struct",
    name: "supasafe::multisig_account::EncryptedViewingKeyInput",
    members: [
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      { name: "ephemeral_pubkey", type: "core::felt252" },
      { name: "ciphertext", type: "core::felt252" },
    ],
  },
  {
    type: "struct",
    name: "core::array::Span::<supasafe::multisig_account::EncryptedViewingKeyInput>",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<supasafe::multisig_account::EncryptedViewingKeyInput>",
      },
    ],
  },
  {
    type: "interface",
    name: "supasafe::supasafe_factory::ISupasafeRegistryFactory",
    items: [
      {
        type: "function",
        name: "register_view_key",
        inputs: [{ name: "public_key", type: "core::felt252" }],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "get_view_key",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [{ type: "supasafe::supasafe_factory::ViewKeyRegistration" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_encrypted_view_key",
        inputs: [
          {
            name: "multisig",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [{ type: "supasafe::supasafe_factory::EncryptedViewKey" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_multisig_metadata",
        inputs: [
          {
            name: "multisig",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [{ type: "supasafe::supasafe_factory::MultisigMetadata" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "is_supasafe_multisig",
        inputs: [
          {
            name: "multisig",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [{ type: "core::bool" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "create_multisig",
        inputs: [
          {
            name: "owners",
            type: "core::array::Span::<supasafe::multisig_account::Owner>",
          },
          { name: "threshold", type: "core::integer::u32" },
          { name: "viewing_public_key", type: "core::felt252" },
          {
            name: "encrypted",
            type: "core::array::Span::<supasafe::multisig_account::EncryptedViewingKeyInput>",
          },
          { name: "salt", type: "core::felt252" },
        ],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "external",
      },
    ],
  },
] as const;

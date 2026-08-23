// SRC5 interface ids registered by PrivateMultisigAccount at construction.
export const ISRC6_ID =
  "0x2ceccef7f994940b3962a6c67e0ba4fcd37df7d131417c604f91e03caecc1cd";
export const ISRC9_V2_ID =
  "0x1d1144bb2138366ff28d8e9ab57456b1d332ac42196230c3a602003c89872";
export const ICUSTOM_SIGNATURE_VALIDATION_ID =
  "0x2eb9faa4ce06e09879e93803798b87d22877b73964334356bf9e0d8cc22ded";

/** Number of wei (base units) per one whole token. */
export const WEI_PER_TOKEN = 10n ** 18n;

// Owners are addressed by index in the signature bundle.
export const MAX_OWNERS = 32;

export const TOKENS = [
  {
    symbol: "STRK",
    address:
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    decimals: 18,
  },
  {
    symbol: "ETH",
    address:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    decimals: 18,
  },
];

export type Token = {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
};

export const tokens: readonly Token[] = [
  {
    name: "Starknet Token",
    symbol: "STRK",
    address:
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    decimals: 18,
  },
  {
    name: "Ether",
    symbol: "ETH",
    address:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    decimals: 18,
  },
  {
    name: "Vesu STRK",
    symbol: "vSTRK",
    address:
      "0x04cd290592b3520ced3951d55e2c7f036832f6f9579b4dfe3a80f91ccda2ae8a",
    decimals: 18,
  },
  {
    name: "Vesu ETH",
    symbol: "vETH",
    address:
      "0x06811b89c6cac2726b62e872c4ff776c4d6538a544dc9a9b6b7a14350f4170e4",
    decimals: 18,
  },
];

export const swapTokens = tokens.filter(
  (token) => token.symbol === "STRK" || token.symbol === "ETH",
);

export function getTokenByAddress(address: string | undefined) {
  if (!address) return undefined;

  try {
    const normalizedAddress = BigInt(address);
    return tokens.find((token) => BigInt(token.address) === normalizedAddress);
  } catch {
    return undefined;
  }
}

export function getTokenBySymbol(symbol: string | undefined) {
  if (!symbol) return undefined;

  return tokens.find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase(),
  );
}

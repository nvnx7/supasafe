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
];

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

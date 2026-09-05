export function calculateUsdValue({
  amount,
  decimals,
  priceUsd,
}: {
  amount: bigint;
  decimals: number;
  priceUsd: number | undefined;
}) {
  if (priceUsd === undefined || !Number.isFinite(priceUsd)) return undefined;

  const divisor = 10 ** decimals;
  const tokenAmount = Number(amount) / divisor;
  const value = tokenAmount * priceUsd;
  return Number.isFinite(value) ? value : undefined;
}

export function formatUsdValue(value: number | undefined) {
  if (value === undefined) return "Price Unavailable";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 4,
  }).format(value);
}

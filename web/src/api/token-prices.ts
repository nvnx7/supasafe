"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiKeyCoinGecko } from "@/config/env";
import { tokens } from "@/config/tokens";

const COINGECKO_SIMPLE_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price";

type CoinGeckoSimplePriceResponse = Record<string, { usd?: number }>;

export type TokenUsdPrices = Record<string, number | undefined>;

export async function getTokenUsdPrices(
  priceTickers = tokens.map((token) => token.coingeckoPriceId),
  signal?: AbortSignal,
): Promise<TokenUsdPrices> {
  if (!apiKeyCoinGecko) {
    throw new Error("CoinGecko API key is not configured.");
  }

  const uniquePriceTickers = [...new Set(priceTickers)];
  if (uniquePriceTickers.length === 0) return {};

  const { data } = await axios.get<CoinGeckoSimplePriceResponse>(
    COINGECKO_SIMPLE_PRICE_URL,
    {
      headers: { "x-cg-demo-api-key": apiKeyCoinGecko },
      params: {
        ids: uniquePriceTickers.join(","),
        vs_currencies: "usd",
      },
      signal,
    },
  );

  return Object.fromEntries(
    uniquePriceTickers.map((priceTicker) => {
      const price = data[priceTicker]?.usd;
      return [
        priceTicker,
        typeof price === "number" && Number.isFinite(price) ? price : undefined,
      ];
    }),
  );
}

export function useTokenUsdPrices() {
  const priceTickers = [
    ...new Set(tokens.map((token) => token.coingeckoPriceId)),
  ];

  return useQuery({
    queryKey: ["tokenUsdPrices", priceTickers],
    queryFn: ({ signal }) => getTokenUsdPrices(priceTickers, signal),
    enabled: Boolean(apiKeyCoinGecko),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

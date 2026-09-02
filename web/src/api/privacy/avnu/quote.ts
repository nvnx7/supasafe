"use client";

import { getQuotes, type Quote } from "@avnu/avnu-sdk";
import { useQuery } from "@tanstack/react-query";
import { networkConfig } from "@/config/network";
import { getAvnuOptions } from "./config";

export async function getAvnuPrivateSwapQuote({
  sellTokenAddress,
  buyTokenAddress,
  sellAmount,
  takerAddress,
  signal,
}: {
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: bigint;
  takerAddress: string;
  signal?: AbortSignal;
}): Promise<Quote> {
  if (sellAmount <= 0n) {
    throw new Error("An AVNU private swap needs an amount greater than zero.");
  }

  const quotes = await getQuotes(
    {
      sellTokenAddress,
      buyTokenAddress,
      sellAmount,
      takerAddress,
      size: 1,
    },
    { ...getAvnuOptions(), abortSignal: signal },
  );
  const [quote] = quotes;
  if (!quote) {
    throw new Error("AVNU did not return a private swap route for this pair.");
  }

  return quote;
}

export function useAvnuPrivateSwapQuote({
  sellTokenAddress,
  buyTokenAddress,
  sellAmount,
  takerAddress,
}: {
  sellTokenAddress: string | undefined;
  buyTokenAddress: string | undefined;
  sellAmount: bigint | undefined;
  takerAddress: string | undefined;
}) {
  return useQuery({
    queryKey: [
      "avnuPrivateSwapQuote",
      networkConfig.chainId,
      sellTokenAddress,
      buyTokenAddress,
      sellAmount?.toString(),
      takerAddress,
    ],
    queryFn: ({ signal }) =>
      getAvnuPrivateSwapQuote({
        sellTokenAddress: sellTokenAddress as string,
        buyTokenAddress: buyTokenAddress as string,
        sellAmount: sellAmount as bigint,
        takerAddress: takerAddress as string,
        signal,
      }),
    enabled: Boolean(
      sellTokenAddress &&
        buyTokenAddress &&
        sellAmount &&
        sellAmount > 0n &&
        takerAddress,
    ),
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

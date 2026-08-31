"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { networkConfig } from "@/config/network";

const EKUBO_QUOTER_URL = "https://prod-api-quoter.ekubo.org";

type EkuboQuoteResponse = {
  block_number: number;
  total_calculated: string;
};

export type EkuboSwapQuote = {
  outputAmount: bigint;
  blockNumber: number;
};

export async function getEkuboSwapQuote({
  fromToken,
  toToken,
  amount,
  signal,
}: {
  fromToken: string;
  toToken: string;
  amount: bigint;
  signal?: AbortSignal;
}): Promise<EkuboSwapQuote> {
  if (amount <= 0n) {
    throw new Error("A swap quote needs an amount greater than zero.");
  }

  const chainId = BigInt(networkConfig.chainId).toString();
  const { data } = await axios.get<EkuboQuoteResponse>(
    `${EKUBO_QUOTER_URL}/${chainId}/${amount}/${fromToken}/${toToken}`,
    { signal },
  );
  const outputAmount = BigInt(data.total_calculated);
  if (outputAmount <= 0n) {
    throw new Error("Ekubo did not return a positive output amount.");
  }

  return { outputAmount, blockNumber: data.block_number };
}

export function useEkuboSwapQuote({
  fromToken,
  toToken,
  amount,
}: {
  fromToken: string | undefined;
  toToken: string | undefined;
  amount: bigint | undefined;
}) {
  return useQuery({
    queryKey: [
      "ekuboSwapQuote",
      networkConfig.chainId,
      fromToken,
      toToken,
      amount?.toString(),
    ],
    queryFn: ({ signal }) =>
      getEkuboSwapQuote({
        fromToken: fromToken as string,
        toToken: toToken as string,
        amount: amount as bigint,
        signal,
      }),
    enabled: Boolean(
      networkConfig.ekuboExecutorAddress &&
        fromToken &&
        toToken &&
        amount &&
        amount > 0n,
    ),
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

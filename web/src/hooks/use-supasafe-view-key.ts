"use client";

import {
  type UseSignTypedDataArgs,
  useAccount,
  useSignTypedData,
} from "@starknetfoundation/starknet-start-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Signature } from "starknet";
import { networkConfig } from "@/config/network";
import {
  buildSupasafeViewKeyTypedData,
  deriveSupasafeViewKey,
  loadSupasafeViewKey,
  type SupasafeViewKey,
  saveSupasafeViewKey,
} from "@/utils/privacy";

type Status = "idle" | "signing" | "ready" | "error";

function contextKey(address: string) {
  return [
    networkConfig.chainId,
    networkConfig.supasafeFactoryAddress,
    address,
  ].join(":");
}

export function useSupasafeViewKey() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData({});
  const [status, setStatus] = useState<Status>("idle");
  const [viewKey, setViewKey] = useState<SupasafeViewKey | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const attemptedContext = useRef<string | null>(null);
  const signTypedDataAsyncRef = useRef(signTypedDataAsync);

  useEffect(() => {
    signTypedDataAsyncRef.current = signTypedDataAsync;
  }, [signTypedDataAsync]);

  const deriveAndCache = useCallback(async (owner: string) => {
    const context = {
      owner,
      chainId: networkConfig.chainId,
      factoryAddress: networkConfig.supasafeFactoryAddress,
    };

    setStatus("signing");
    setError(null);

    try {
      const signature = (await signTypedDataAsyncRef.current(
        buildSupasafeViewKeyTypedData(
          context.chainId,
          context.factoryAddress,
        ) as unknown as UseSignTypedDataArgs,
      )) as Signature;
      const derived = deriveSupasafeViewKey(signature);
      saveSupasafeViewKey(context, derived);
      setViewKey(derived);
      setStatus("ready");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason
          : new Error("Could not derive Supasafe view key."),
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!address) {
      attemptedContext.current = null;
      setViewKey(null);
      setError(null);
      setStatus("idle");
      return;
    }

    const key = contextKey(address);
    const cached = loadSupasafeViewKey({
      owner: address,
      chainId: networkConfig.chainId,
      factoryAddress: networkConfig.supasafeFactoryAddress,
    });

    if (cached) {
      attemptedContext.current = key;
      setViewKey(cached);
      setError(null);
      setStatus("ready");
      return;
    }

    setViewKey(null);
    if (attemptedContext.current === key) return;

    attemptedContext.current = key;
    void deriveAndCache(address);
  }, [address, deriveAndCache]);

  const retry = useCallback(() => {
    if (!address) return;
    attemptedContext.current = null;
    void deriveAndCache(address);
  }, [address, deriveAndCache]);

  return {
    ...viewKey,
    error,
    isReady: status === "ready",
    isSigning: status === "signing",
    retry,
  };
}

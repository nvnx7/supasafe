"use client";

import { useState } from "react";

import { AvnuSwapForm } from "@/components/multisig/avnu-swap-form";
import { EkuboSwapForm } from "@/components/multisig/ekubo-swap-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { avnuConfig, ekuboConfig } from "@/config/dapp";

type SwapProvider = "ekubo" | "avnu";

const isEkuboConfigured = Boolean(
  ekuboConfig.executorAddress &&
    ekuboConfig.coreAddress &&
    ekuboConfig.routerAddress &&
    ekuboConfig.pools.length,
);
const isAvnuConfigured = Boolean(
  avnuConfig.baseUrl && avnuConfig.paymasterBaseUrl,
);

export function SwapPanel() {
  const [provider, setProvider] = useState<SwapProvider>(
    isEkuboConfigured ? "ekubo" : "avnu",
  );

  if (!isEkuboConfigured && !isAvnuConfigured) {
    return (
      <p className="text-sm text-muted-foreground">
        Private swaps are not configured for this network yet.
      </p>
    );
  }

  return (
    <Tabs
      className="grid gap-6"
      onValueChange={(value) => setProvider(value as SwapProvider)}
      value={provider}
    >
      <TabsList aria-label="Swap provider">
        <TabsTrigger disabled={!isEkuboConfigured} value="ekubo">
          Ekubo
        </TabsTrigger>
        <TabsTrigger disabled={!isAvnuConfigured} value="avnu">
          AVNU
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ekubo">
        <EkuboSwapForm />
      </TabsContent>
      <TabsContent value="avnu">
        <AvnuSwapForm />
      </TabsContent>
    </Tabs>
  );
}

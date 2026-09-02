"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { RefreshCwIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  useGetEncryptedViewingKey,
  useGetMultisigViewingPublicKey,
} from "@/api/multisig";
import {
  useGetMultisigStrk20Balances,
  useGetPublicViewKey,
} from "@/api/privacy";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { tokens } from "@/config/tokens";
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";
import { decryptViewKey } from "@/utils/encryption";

function formatAmount(amount: bigint, decimals: number) {
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = (amount % base).toString().padStart(decimals, "0");
  const trimmedFraction = fraction.replace(/0+$/, "");
  return trimmedFraction
    ? `${whole}.${trimmedFraction.slice(0, 4)}`
    : `${whole}`;
}

export function MultisigBalances() {
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { address } = useAccount();
  const { privateKey: supasafeViewKey } = useSupasafeViewKey();
  const encryptedKey = useGetEncryptedViewingKey(multisigAddress, address);
  const viewingPublicKey = useGetMultisigViewingPublicKey(multisigAddress);
  const poolViewKey = useGetPublicViewKey(multisigAddress);

  const multisigViewingKey = useMemo(() => {
    if (
      !supasafeViewKey ||
      !encryptedKey.data ||
      viewingPublicKey.data === undefined
    ) {
      return undefined;
    }

    try {
      const key = decryptViewKey({
        ephemeralPubkey: encryptedKey.data.ephemeralPubkey,
        ciphertext: encryptedKey.data.ciphertext,
        recipientPrivateKey: supasafeViewKey,
      });
      return derivePublicKey(key) === viewingPublicKey.data ? key : undefined;
    } catch {
      return undefined;
    }
  }, [encryptedKey.data, supasafeViewKey, viewingPublicKey.data]);

  const balances = useGetMultisigStrk20Balances({
    multisigAddress,
    viewingKey: poolViewKey.data ? multisigViewingKey : undefined,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Private balances</CardTitle>
        <CardDescription>STRK20 notes held by this multisig.</CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh private balances"
            title="Refresh private balances"
            onClick={() => void balances.refetch()}
            disabled={balances.isFetching || !multisigViewingKey}
          >
            <RefreshCwIcon
              className={balances.isFetching ? "animate-spin" : undefined}
            />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {poolViewKey.isLoading || balances.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : null}
        {poolViewKey.data === null ? (
          <p className="text-sm text-muted-foreground">
            Activate STRK20 to view private balances.
          </p>
        ) : null}
        {poolViewKey.data && !multisigViewingKey ? (
          <p className="text-sm text-muted-foreground">
            Your recovered Supasafe view key is required to view balances.
          </p>
        ) : null}
        {balances.error ? (
          <p className="text-sm text-destructive">{balances.error.message}</p>
        ) : null}
        {balances.data ? (
          <div className="flex flex-col gap-3">
            {tokens.map((token) => {
              const balance = balances.data.find(
                (entry) => BigInt(entry.token) === BigInt(token.address),
              );
              return (
                <div
                  key={token.address}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-muted-foreground">{token.symbol}</span>
                  <span className="font-mono">
                    {formatAmount(balance?.amount ?? 0n, token.decimals)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

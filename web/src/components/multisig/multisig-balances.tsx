"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { KeyRoundIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react";
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
import { TokenLogo } from "@/components/token-logo";
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
    <Card className="[--card-spacing:--spacing(5)]">
      <CardHeader className="border-b">
        <CardTitle>Shielded Token Balances</CardTitle>
        <CardDescription>
          Private assets and positions held by this multisig.
        </CardDescription>
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
              data-icon="inline-start"
              className={balances.isFetching ? "animate-spin" : undefined}
            />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {poolViewKey.isLoading || balances.isLoading ? (
          <div className="flex flex-col gap-3 px-(--card-spacing) py-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}
        {poolViewKey.data === null ? (
          <div className="flex min-h-28 items-center gap-3 px-(--card-spacing) py-5 text-sm text-muted-foreground">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <ShieldCheckIcon className="size-5" />
            </span>
            <p>
              Activate STRK20 to view this multisig&apos;s private balances.
            </p>
          </div>
        ) : null}
        {poolViewKey.data && !multisigViewingKey ? (
          <div className="flex min-h-28 items-center gap-3 px-(--card-spacing) py-5 text-sm text-muted-foreground">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <KeyRoundIcon className="size-5" />
            </span>
            <p>
              Connect an owner wallet with its recovered Supasafe view key to
              reveal private balances.
            </p>
          </div>
        ) : null}
        {balances.error ? (
          <p className="px-(--card-spacing) py-5 text-sm text-destructive">
            {balances.error.message}
          </p>
        ) : null}
        {balances.data ? (
          <div className="divide-y">
            {tokens.map((token) => {
              const balance = balances.data.find(
                (entry) => BigInt(entry.token) === BigInt(token.address),
              );
              return (
                <div
                  key={token.address}
                  className="flex min-h-22 items-center justify-between gap-4 px-(--card-spacing) py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenLogo token={token} className="size-11" />
                    <span className="min-w-0">
                      <span className="font-medium">{token.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {token.symbol}
                      </span>
                    </span>
                  </div>
                  <span className="text-right">
                    <span className="block text-base font-semibold tabular-nums">
                      {formatAmount(balance?.amount ?? 0n, token.decimals)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {token.symbol}
                    </span>
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

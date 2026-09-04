"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import {
  CheckCircle2Icon,
  Clock3Icon,
  CoinsIcon,
  CopyIcon,
  ExternalLinkIcon,
  PlusIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useGetMultisig, useGetMultisigViewingPublicKey } from "@/api/multisig";
import { useGetPublicViewKey } from "@/api/privacy";
import { useGetOwnerProposals } from "@/api/proposal";
import { ActivateMultisigButton } from "@/components/multisig/activate-multisig-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { network } from "@/config/env";
import { tokens } from "@/config/tokens";
import { truncateAddress } from "@/lib/multisig";

const PLACEHOLDER_TOTAL_BALANCE = "$42,850.40";

function getExplorerUrl(address: string) {
  if (network === "mainnet") {
    return `https://voyager.online/contract/${address}`;
  }

  if (network === "sepolia") {
    return `https://sepolia.voyager.online/contract/${address}`;
  }

  return undefined;
}

export function MultisigOverview() {
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { address: ownerAddress } = useAccount();
  const { data: multisig, isLoading } = useGetMultisig(multisigAddress);
  const { data: poolViewKey } = useGetPublicViewKey(multisigAddress);
  const { data: factoryViewKey } =
    useGetMultisigViewingPublicKey(multisigAddress);
  const { data: proposals, isLoading: proposalsLoading } = useGetOwnerProposals(
    multisigAddress,
    ownerAddress,
  );

  if (isLoading || !multisig) {
    return <Skeleton className="h-64 w-full" />;
  }

  const { address, owners, threshold } = multisig;
  const keyMatches =
    poolViewKey !== null &&
    poolViewKey !== undefined &&
    factoryViewKey !== undefined &&
    poolViewKey === factoryViewKey;
  const isActive = poolViewKey !== null && poolViewKey !== undefined;
  const explorerUrl = getExplorerUrl(address);

  function handleNewTransaction() {}

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
  }

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader className="flex flex-wrap items-center gap-2">
        <CardTitle>Multisig</CardTitle>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground" title={address}>
            {truncateAddress(address, 10)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Copy multisig address"
            title="Copy Multisig Address"
            onClick={() => void copyAddress()}
          >
            <CopyIcon />
          </Button>
          {explorerUrl ? (
            <Button
              render={<a href={explorerUrl} target="_blank" rel="noreferrer" />}
              variant="ghost"
              size="icon-xs"
              aria-label="View Multisig On Voyager"
              title="View Multisig On Voyager"
            >
              <ExternalLinkIcon />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-5 pb-8">
          <div>
            <p className="text-4xl font-bold tabular-nums sm:text-5xl">
              {PLACEHOLDER_TOTAL_BALANCE}
            </p>
            <Badge
              className="mt-3"
              variant={isActive ? "secondary" : "outline"}
            >
              {isActive ? <CheckCircle2Icon /> : <TriangleAlertIcon />}
              {isActive ? "Private Account Active" : "Activation Required"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isActive && poolViewKey === null ? (
              <ActivateMultisigButton multisig={multisig} />
            ) : null}
            <Button type="button" size="lg" onClick={handleNewTransaction}>
              <PlusIcon data-icon="inline-start" />
              New Transaction
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 pt-7 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/70 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-brand-secondary ring-1 ring-border">
              <CoinsIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Shielded Balances</p>
              <p className="text-lg tabular-nums">{tokens.length} Assets</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/70 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-brand-secondary ring-1 ring-border">
              <UsersRoundIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Multisig Policy</p>
              <p className="text-lg tabular-nums">
                {threshold} of {owners.length} Required
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/70 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-brand-secondary ring-1 ring-border">
              <Clock3Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
              <p className="text-lg tabular-nums">
                {!ownerAddress
                  ? "Connect wallet"
                  : proposalsLoading
                    ? "Loading"
                    : `${proposals?.length ?? 0} open`}
              </p>
            </div>
          </div>
        </div>

        {poolViewKey && factoryViewKey !== undefined && !keyMatches ? (
          <p className="pt-4 text-sm text-destructive">
            The registered pool view key does not match this multisig.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

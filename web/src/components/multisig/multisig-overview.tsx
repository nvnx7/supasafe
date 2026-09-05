"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  CoinsIcon,
  CopyIcon,
  ExternalLinkIcon,
  PlusIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useGetMultisig, useGetMultisigViewingPublicKey } from "@/api/multisig";
import {
  useGetMultisigStrk20Balances,
  useGetPublicViewKey,
} from "@/api/privacy";
import { useGetOwnerProposals } from "@/api/proposal";
import { useTokenUsdPrices } from "@/api/token-prices";
import { ActivateMultisigButton } from "@/components/multisig/activate-multisig-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { network } from "@/config/env";
import { getTokenByAddress, tokens } from "@/config/tokens";
import { useMultisigViewingKey } from "@/hooks/use-multisig-viewing-key";
import { truncateAddress } from "@/lib/multisig";
import { calculateUsdValue, formatUsdValue } from "@/utils/prices";

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
  const router = useRouter();
  const { address: ownerAddress } = useAccount();
  const { data: multisig, isLoading } = useGetMultisig(multisigAddress);
  const { data: poolViewKey } = useGetPublicViewKey(multisigAddress);
  const multisigViewingKey = useMultisigViewingKey(multisigAddress);
  const balances = useGetMultisigStrk20Balances({
    multisigAddress,
    viewingKey: poolViewKey ? multisigViewingKey : undefined,
  });
  const tokenUsdPrices = useTokenUsdPrices();
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
  const hasActivationProposal = proposals?.some(
    (proposal) => proposal.display.kind === "strk20-registration",
  );
  const openProposalCount = proposals?.length ?? 0;
  const hasPendingApprovals = openProposalCount > 0;
  const explorerUrl = getExplorerUrl(address);
  const totalUsdBalance = balances.data?.reduce<number | undefined>(
    (total, balance) => {
      if (total === undefined) return undefined;
      const token = getTokenByAddress(balance.token);
      if (!token) return total;
      const value = calculateUsdValue({
        amount: balance.amount,
        decimals: token.decimals,
        priceUsd: tokenUsdPrices.data?.[token.coingeckoPriceId],
      });
      return value === undefined ? undefined : total + value;
    },
    0,
  );

  function handleNewTransaction() {
    router.push(`/${multisigAddress}/tx`);
  }

  function handleViewProposals() {
    router.push(`/${multisigAddress}/proposals`);
  }

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
            <p className="text-xs text-muted-foreground">
              Total Shielded Balance
            </p>
            <p className="mt-1 pt-2 pb-4 text-4xl font-bold tabular-nums sm:text-5xl">
              {balances.isLoading || tokenUsdPrices.isLoading
                ? "…"
                : totalUsdBalance !== undefined
                  ? formatUsdValue(totalUsdBalance)
                  : "$0.00"}
            </p>
            <Badge variant={isActive ? "secondary" : "outline"}>
              {isActive ? <CheckCircle2Icon /> : <TriangleAlertIcon />}
              {isActive ? "Private Account Active" : "Activation Required"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isActive && poolViewKey === null ? (
              hasActivationProposal ? (
                <Badge variant="outline">Activation Proposal Pending</Badge>
              ) : (
                <ActivateMultisigButton multisig={multisig} />
              )
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleViewProposals}
            >
              View Proposals
            </Button>
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
              <p className="text-md font-semibold tabular-nums">
                {tokens.length} Assets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/70 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-brand-secondary ring-1 ring-border">
              <UsersRoundIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Multisig Policy</p>
              <p className="text-md font-semibold tabular-nums">
                {threshold} of {owners.length} Required
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`group flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
              hasPendingApprovals
                ? "border-brand-tertiary/50 bg-brand-tertiary/10 hover:bg-brand-tertiary/15"
                : "bg-secondary/70 hover:bg-secondary"
            }`}
            onClick={handleViewProposals}
            aria-label="View Multisig Proposals"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-brand-secondary ring-1 ring-border">
              <Clock3Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
              <p className="text-md font-semibold tabular-nums">
                {!ownerAddress
                  ? "Connect wallet"
                  : proposalsLoading
                    ? "Loading"
                    : hasPendingApprovals
                      ? `${openProposalCount} Awaiting`
                      : "No Pending Approvals"}
              </p>
            </div>
            <ArrowRightIcon className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
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

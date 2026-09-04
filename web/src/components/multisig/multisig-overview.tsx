"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import {
  CheckCircle2Icon,
  Clock3Icon,
  CoinsIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useGetMultisig, useGetMultisigViewingPublicKey } from "@/api/multisig";
import { useGetPublicViewKey } from "@/api/privacy";
import { useGetOwnerProposals } from "@/api/proposal";
import { ActivateMultisigButton } from "@/components/multisig/activate-multisig-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { tokens } from "@/config/tokens";
import { truncateAddress } from "@/lib/multisig";

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

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>Multisig account</CardTitle>
        <CardDescription className="font-mono">
          {truncateAddress(address, 10)}
        </CardDescription>
        <CardAction className="col-span-2 row-start-3 mt-3 justify-self-start sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isActive ? "secondary" : "outline"}>
              {isActive ? <CheckCircle2Icon /> : <TriangleAlertIcon />}
              {isActive ? "Private account active" : "Activation required"}
            </Badge>
            {!isActive && poolViewKey === null ? (
              <ActivateMultisigButton multisig={multisig} />
            ) : null}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="pb-6">
          <p className="text-sm text-muted-foreground">Private treasury</p>
          <p className="font-heading text-3xl font-bold tracking-normal">
            Shielded assets
          </p>
        </div>

        <Separator />

        <div className="grid gap-3 pt-6 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted p-4 ring-1 ring-border">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-brand-secondary ring-1 ring-border">
              <CoinsIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Shielded balances</p>
              <p className="font-semibold">{tokens.length} supported assets</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted p-4 ring-1 ring-border">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-brand-secondary ring-1 ring-border">
              <UsersRoundIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Multisig policy</p>
              <p className="font-semibold">
                {threshold} of {owners.length} required
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted p-4 ring-1 ring-border">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-brand-secondary ring-1 ring-border">
              <Clock3Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Pending approvals</p>
              <p className="font-semibold">
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

"use client";

import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useGetMultisig, useGetMultisigViewingPublicKey } from "@/api/multisig";
import { useGetPublicViewKey } from "@/api/privacy";
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
import { Skeleton } from "@/components/ui/skeleton";
import { truncateAddress } from "@/lib/multisig";

export function MultisigOverview() {
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { data: multisig, isLoading } = useGetMultisig(multisigAddress);
  const { data: poolViewKey } = useGetPublicViewKey(multisigAddress);
  const { data: factoryViewKey } =
    useGetMultisigViewingPublicKey(multisigAddress);

  if (isLoading || !multisig) {
    return <Skeleton className="h-32 w-full" />;
  }

  const { address, owners, threshold } = multisig;
  const keyMatches =
    poolViewKey !== null &&
    poolViewKey !== undefined &&
    factoryViewKey !== undefined &&
    poolViewKey === factoryViewKey;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multisig</CardTitle>
        <CardDescription className="font-mono">
          {truncateAddress(address, 10)}
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {threshold} of {owners.length}
            </Badge>
            {poolViewKey === null ? (
              <ActivateMultisigButton multisig={multisig} />
            ) : null}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {threshold} of {owners.length}{" "}
            {owners.length === 1 ? "owner" : "owners"} must sign before a
            transaction can execute.
          </p>
          {poolViewKey ? (
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Pool view key</span>
              <span className="flex min-w-0 items-center gap-2 font-mono">
                <span title={`0x${poolViewKey.toString(16)}`}>
                  {truncateAddress(`0x${poolViewKey.toString(16)}`, 10)}
                </span>
                {keyMatches ? (
                  <CheckCircle2Icon
                    className="size-4 shrink-0 text-emerald-600"
                    aria-label="Matches Supasafe view key"
                  />
                ) : factoryViewKey !== undefined ? (
                  <TriangleAlertIcon
                    className="size-4 shrink-0 text-destructive"
                    aria-label="Does not match Supasafe view key"
                  />
                ) : null}
              </span>
            </div>
          ) : null}
          {poolViewKey && factoryViewKey !== undefined && !keyMatches ? (
            <p className="text-sm text-destructive">
              The registered pool view key does not match this multisig.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

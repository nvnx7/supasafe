"use client";

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
import { useMultisig } from "@/hooks/use-multisig";
import { truncateAddress } from "@/lib/multisig";

/** Headline facts about the multisig: address and signing threshold. */
export function MultisigOverview() {
  const { multisig, isLoading } = useMultisig();

  if (isLoading || !multisig) {
    return <Skeleton className="h-32 w-full" />;
  }

  const { address, owners, threshold } = multisig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multisig</CardTitle>
        <CardDescription className="font-mono">
          {truncateAddress(address, 10)}
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">
            {threshold} of {owners.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {threshold} of {owners.length}{" "}
          {owners.length === 1 ? "owner" : "owners"} must sign before a
          transaction can execute.
        </p>
      </CardContent>
    </Card>
  );
}

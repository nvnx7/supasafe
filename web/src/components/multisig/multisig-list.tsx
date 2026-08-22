"use client";

import { ShieldIcon, WalletIcon } from "lucide-react";
import { CreateMultisigButton } from "@/components/multisig/create-multisig-button";
import { MultisigCard } from "@/components/multisig/multisig-card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useMultisigs } from "@/hooks/use-multisigs";

/**
 * The connected wallet's multisigs.
 *
 * Owns every display state — disconnected, loading, empty, populated — so the
 * page stays a pure composition of components.
 */
export function MultisigList() {
  const { isConnected, multisigs, isLoading } = useMultisigs();

  if (!isConnected) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WalletIcon />
          </EmptyMedia>
          <EmptyTitle>No wallet connected</EmptyTitle>
          <EmptyDescription>
            Connect a wallet to see the multisigs it controls.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (multisigs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldIcon />
          </EmptyMedia>
          <EmptyTitle>No multisigs yet</EmptyTitle>
          <EmptyDescription>
            Create a multisig to start holding funds behind a signing threshold.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CreateMultisigButton />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {multisigs.map((multisig) => (
        <MultisigCard key={multisig.address} multisig={multisig} />
      ))}
    </div>
  );
}

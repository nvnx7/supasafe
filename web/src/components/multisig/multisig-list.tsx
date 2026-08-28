"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { ShieldIcon, TriangleAlertIcon, WalletIcon } from "lucide-react";
import { useGetMultisigs } from "@/api/multisig";
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

export function MultisigList() {
  const { address } = useAccount();
  const { data: multisigs = [], isLoading, error } = useGetMultisigs(address);

  if (!address) {
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

  if (error) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Could not load multisigs</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
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

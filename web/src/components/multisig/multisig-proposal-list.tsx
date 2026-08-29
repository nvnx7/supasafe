"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { CheckCircle2Icon, Clock3Icon } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useGetOwnerProposals } from "@/api/proposal";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MultisigProposalDialog } from "./multisig-proposal-dialog";

export function MultisigProposalList() {
  const { address } = useAccount();
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { data: proposals, isLoading } = useGetOwnerProposals(
    multisigAddress,
    address,
  );
  const [selectedHash, setSelectedHash] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposals</CardTitle>
        <CardDescription>Actions awaiting multisig approval.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? <Skeleton className="h-16 w-full" /> : null}
        {!isLoading && !address ? (
          <p className="text-sm text-muted-foreground">
            Connect an owner wallet.
          </p>
        ) : null}
        {!isLoading && address && proposals?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No proposals yet.</p>
        ) : null}
        {proposals?.map((proposal) => (
          <button
            type="button"
            key={proposal.hash}
            onClick={() => setSelectedHash(proposal.hash)}
            className="flex w-full items-start justify-between gap-3 border-b pb-3 text-left last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{proposal.display.title}</p>
              <p className="text-sm text-muted-foreground">
                {proposal.display.description}
              </p>
            </div>
            <Badge
              variant={proposal.status === "ready" ? "default" : "secondary"}
            >
              {proposal.status === "ready" ? (
                <CheckCircle2Icon />
              ) : (
                <Clock3Icon />
              )}
              {proposal.signatureCount} / {proposal.threshold}
            </Badge>
          </button>
        ))}
      </CardContent>
      <MultisigProposalDialog
        hash={selectedHash}
        open={selectedHash !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHash(null);
        }}
      />
    </Card>
  );
}

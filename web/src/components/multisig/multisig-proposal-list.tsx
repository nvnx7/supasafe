"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClipboardListIcon,
  Clock3Icon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useGetOwnerProposals } from "@/api/proposal";
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
import { MultisigProposalDialog } from "./multisig-proposal-dialog";

export function MultisigProposalList() {
  const { address } = useAccount();
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { data: proposals, isLoading } = useGetOwnerProposals(
    multisigAddress,
    address,
  );
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const hasProposals = Boolean(proposals?.length);

  return (
    <>
      <Link
        href={`/${multisigAddress}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-brand-secondary"
      >
        <ArrowLeftIcon className="size-4" />
        Back to overview
      </Link>

      <Card className="[--card-spacing:--spacing(0)]">
        <CardHeader className="border-b px-6 py-6">
          <CardTitle className="text-2xl">Proposals</CardTitle>
          <CardDescription>
            Review transactions awaiting owner approval.
          </CardDescription>
          <CardAction>
            <Link
              href={`/${multisigAddress}/tx`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              <PlusIcon className="size-4" />
              New transaction
            </Link>
          </CardAction>
        </CardHeader>

        <CardContent className="px-0">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-22 w-full" />
              <Skeleton className="h-22 w-full" />
            </div>
          ) : null}

          {!isLoading && !address ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium">Connect an owner wallet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect a multisig owner to review its proposals.
              </p>
            </div>
          ) : null}

          {!isLoading && address && !hasProposals ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <ClipboardListIcon className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium">No active proposals</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New transactions that need approval will appear here.
              </p>
              <Link
                href={`/${multisigAddress}/tx`}
                className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                <PlusIcon className="size-4" />
                New transaction
              </Link>
            </div>
          ) : null}

          {proposals?.map((proposal) => {
            const isReady = proposal.status === "ready";

            return (
              <button
                type="button"
                key={proposal.hash}
                onClick={() => setSelectedHash(proposal.hash)}
                className="group flex w-full items-center gap-4 border-b border-border px-6 py-5 text-left transition-colors last:border-b-0 hover:bg-muted/45 focus-visible:bg-muted/45 focus-visible:outline-none"
              >
                <div
                  className={
                    isReady
                      ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                      : "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  }
                >
                  {isReady ? (
                    <CheckCircle2Icon className="size-5" />
                  ) : (
                    <Clock3Icon className="size-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {proposal.display.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {proposal.display.description}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-medium">
                    {proposal.signatureCount} of {proposal.threshold} approvals
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCreatedAt(proposal.createdAt)}
                  </p>
                </div>

                <Badge
                  variant={isReady ? "secondary" : "outline"}
                  className="hidden shrink-0 sm:inline-flex"
                >
                  {isReady ? "Ready" : "Pending"}
                </Badge>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </CardContent>
      </Card>
      <MultisigProposalDialog
        hash={selectedHash}
        open={selectedHash !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHash(null);
        }}
      />
    </>
  );
}

function formatCreatedAt(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { ShieldCheckIcon, TriangleAlertIcon, WalletIcon } from "lucide-react";
import { useGetMultisigs } from "@/api/multisig";
import { MultisigCard } from "@/components/multisig/multisig-card";
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

export function MultisigList() {
  const { address } = useAccount();
  const { data: multisigs = [], isLoading, error } = useGetMultisigs(address);

  if (!address) {
    return (
      <DirectoryCard description="Private multisig accounts available to the connected wallet.">
        <DirectoryState
          icon={<WalletIcon />}
          title="Connect Ready"
          description="Connect your Ready wallet to view the multisigs it controls."
        />
      </DirectoryCard>
    );
  }

  if (isLoading) {
    return (
      <DirectoryCard description="Private multisig accounts available to the connected wallet.">
        <div className="flex flex-col gap-3 p-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </DirectoryCard>
    );
  }

  if (error) {
    return (
      <DirectoryCard description="Private multisig accounts available to the connected wallet.">
        <DirectoryState
          icon={<TriangleAlertIcon />}
          title="Could Not Load Multisigs"
          description={error.message}
          variant="error"
        />
      </DirectoryCard>
    );
  }

  if (multisigs.length === 0) {
    return (
      <DirectoryCard description="Private multisig accounts available to the connected wallet.">
        <DirectoryState
          icon={<ShieldCheckIcon />}
          title="No Multisigs Yet"
          description="Create a multisig to start holding funds behind a signing threshold."
        />
      </DirectoryCard>
    );
  }

  return (
    <DirectoryCard
      count={multisigs.length}
      description="Private multisig accounts available to the connected wallet."
    >
      <div className="divide-y divide-border">
        {multisigs.map((multisig) => (
          <MultisigCard key={multisig.address} multisig={multisig} />
        ))}
      </div>
    </DirectoryCard>
  );
}

function DirectoryCard({
  children,
  count,
  description,
}: {
  children: React.ReactNode;
  count?: number;
  description: string;
}) {
  return (
    <Card className="[--card-spacing:--spacing(0)]">
      <CardHeader className="border-b px-6 pt-5 !pb-5">
        <CardTitle className="text-lg">Multisig Accounts</CardTitle>
        <CardDescription>{description}</CardDescription>
        {count !== undefined ? (
          <CardAction>
            <Badge variant="secondary">
              {count} {count === 1 ? "Account" : "Accounts"}
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

function DirectoryState({
  description,
  icon,
  title,
  variant = "default",
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
  variant?: "default" | "error";
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <span
        className={
          variant === "error"
            ? "flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive [&_svg]:size-5"
            : "flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground [&_svg]:size-5"
        }
      >
        {icon}
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

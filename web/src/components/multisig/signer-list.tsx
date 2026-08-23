"use client";

import { useParams } from "next/navigation";
import { useGetMultisig } from "@/api/multisig";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { truncateAddress } from "@/lib/multisig";

export function SignerList() {
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { data: multisig, isLoading } = useGetMultisig(multisigAddress);

  if (isLoading || !multisig) {
    return <Skeleton className="h-48 w-full" />;
  }

  const { owners } = multisig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signers</CardTitle>
        <CardDescription>
          {owners.length} {owners.length === 1 ? "owner" : "owners"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {owners.map((owner, index) => (
          <div key={owner} className="flex flex-col gap-3">
            {index > 0 ? <Separator /> : null}
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Owner {index}
              </span>
              <span className="truncate font-mono text-sm">
                {truncateAddress(owner, 10)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

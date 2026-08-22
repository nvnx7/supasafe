import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type MultisigSummary, truncateAddress } from "@/lib/multisig";

/** Presentational summary of a single multisig account. */
export function MultisigCard({ multisig }: { multisig: MultisigSummary }) {
  const { address, threshold, ownerCount } = multisig;

  return (
    <Card className="relative transition-colors hover:bg-muted/50">
      <CardHeader>
        <CardTitle className="font-mono text-sm font-normal">
          {/* Stretched so the whole card is the hit target. */}
          <Link href={`/${address}`} className="after:absolute after:inset-0">
            {truncateAddress(address)}
          </Link>
        </CardTitle>
        <CardDescription>
          {ownerCount} {ownerCount === 1 ? "owner" : "owners"}
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">
            {threshold} of {ownerCount}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

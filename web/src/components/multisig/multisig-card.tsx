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
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm font-normal">
          {truncateAddress(address)}
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

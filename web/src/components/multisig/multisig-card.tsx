import {
  ChevronRightIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { type MultisigSummary, truncateAddress } from "@/lib/multisig";

export function MultisigCard({ multisig }: { multisig: MultisigSummary }) {
  const { address, threshold, ownerCount } = multisig;

  return (
    <Link
      href={`/${address}`}
      className="group grid gap-4 px-6 py-5 transition-colors hover:bg-secondary/45 focus-visible:bg-secondary/45 focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-brand-secondary">
          <ShieldCheckIcon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">
            Multisig Account
          </span>
          <span className="mt-1 block truncate text-sm text-muted-foreground">
            {truncateAddress(address, 10)}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 sm:block sm:min-w-28 sm:text-right">
        <span className="text-xs text-muted-foreground sm:block">
          Signing Policy
        </span>
        <span className="text-sm font-medium text-foreground">
          {threshold} Of {ownerCount}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:min-w-20 sm:justify-end">
        <UsersRoundIcon className="size-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {ownerCount} {ownerCount === 1 ? "Owner" : "Owners"}
        </span>
      </div>

      <ChevronRightIcon className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}

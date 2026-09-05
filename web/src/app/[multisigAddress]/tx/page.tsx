import { Suspense } from "react";
import { TransactionPanel } from "@/components/multisig/transaction-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function MultisigTransactionPage() {
  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <Suspense fallback={<Skeleton className="h-112 w-full" />}>
        <TransactionPanel />
      </Suspense>
    </div>
  );
}

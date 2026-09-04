import { MultisigActions } from "@/components/multisig/multisig-actions";
import { MultisigBalances } from "@/components/multisig/multisig-balances";
import { MultisigOverview } from "@/components/multisig/multisig-overview";

export default function MultisigDetailPage() {
  return (
    <div className="flex flex-col gap-5">
      <MultisigOverview />
      <MultisigActions />
      <MultisigBalances />
    </div>
  );
}

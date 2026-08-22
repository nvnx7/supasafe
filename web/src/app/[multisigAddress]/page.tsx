import { MultisigOverview } from "@/components/multisig/multisig-overview";
import { SignerList } from "@/components/multisig/signer-list";
import { TransactionPanel } from "@/components/multisig/transaction-panel";

export default function MultisigDetailPage() {
  return (
    <div className="flex flex-col gap-6">
      <MultisigOverview />
      <div className="grid gap-6 md:grid-cols-2">
        <SignerList />
        <TransactionPanel />
      </div>
    </div>
  );
}

import { CreateMultisigButton } from "@/components/multisig/create-multisig-button";
import { MultisigList } from "@/components/multisig/multisig-list";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Multisigs</h1>
          <p className="text-sm text-muted-foreground">
            Multisig accounts controlled by the connected wallet.
          </p>
        </div>
        <CreateMultisigButton />
      </div>
      <MultisigList />
    </div>
  );
}

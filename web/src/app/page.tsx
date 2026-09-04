import { CreateMultisigButton } from "@/components/multisig/create-multisig-button";
import { MultisigList } from "@/components/multisig/multisig-list";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-7">
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-brand-secondary">Overview</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-primary">
            Your Multisigs
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Private Multisig Accounts Controlled By Your Wallet.
          </p>
        </div>
        <CreateMultisigButton />
      </section>
      <MultisigList />
    </div>
  );
}

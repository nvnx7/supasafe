import { CreateMultisigForm } from "@/components/multisig/create-multisig-form";

export default function NewMultisigPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New multisig</h1>
        <p className="text-sm text-muted-foreground">
          Add the owner public keys and choose how many signatures a transaction
          needs.
        </p>
      </div>
      <CreateMultisigForm />
    </div>
  );
}

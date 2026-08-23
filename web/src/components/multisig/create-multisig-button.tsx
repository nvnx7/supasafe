"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMultisigs } from "@/hooks/use-multisigs";

export function CreateMultisigButton() {
  const { isConnected } = useMultisigs();

  if (!isConnected) {
    return (
      <Button disabled>
        <PlusIcon data-icon="inline-start" />
        New multisig
      </Button>
    );
  }

  return (
    <Button render={<Link href="/new" />}>
      <PlusIcon data-icon="inline-start" />
      New multisig
    </Button>
  );
}

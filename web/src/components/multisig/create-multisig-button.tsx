"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMultisigs } from "@/hooks/use-multisigs";

/**
 * Entry point to the create-multisig flow.
 *
 * Reads connection state directly so it can be dropped anywhere without the
 * placing component having to pass anything in.
 */
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

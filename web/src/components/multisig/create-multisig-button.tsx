"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CreateMultisigButton() {
  const { address } = useAccount();

  if (!address) {
    return (
      <Button disabled>
        <PlusIcon data-icon="inline-start" />
        New multisig
      </Button>
    );
  }

  return (
    <Button nativeButton={false} render={<Link href="/new" />}>
      <PlusIcon data-icon="inline-start" />
      New multisig
    </Button>
  );
}

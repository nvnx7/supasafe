"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSupasafeViewKeyRegistration } from "@/components/wallet/supasafe-view-key-registration-provider";

export function CreateMultisigButton() {
  const { address } = useAccount();
  const router = useRouter();
  const { isCheckingRegistration, isRegistered, openRegistrationDialog } =
    useSupasafeViewKeyRegistration();

  if (!address) {
    return (
      <Button disabled>
        <PlusIcon data-icon="inline-start" />
        New multisig
      </Button>
    );
  }

  function createMultisig() {
    if (!isRegistered) {
      openRegistrationDialog();
      return;
    }
    router.push("/new");
  }

  return (
    <Button onClick={createMultisig} disabled={isCheckingRegistration}>
      {isCheckingRegistration ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <PlusIcon data-icon="inline-start" />
      )}
      New multisig
    </Button>
  );
}

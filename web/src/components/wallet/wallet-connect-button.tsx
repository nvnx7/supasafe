"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
} from "@starknetfoundation/starknet-start-react";
import {
  CheckIcon,
  ChevronDownIcon,
  KeyRoundIcon,
  LogOutIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useSupasafeViewKeyRegistration } from "@/components/wallet/supasafe-view-key-registration-provider";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isReadyWallet(wallet: { name: string }) {
  return wallet.name.toLowerCase().includes("ready");
}

export function WalletConnectButton() {
  const { address, connector } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const readyConnector = connectors.find(isReadyWallet);
  const {
    hasViewKeyMismatch,
    isCheckingRegistration,
    isRegistered,
    isRegistrationInFlight,
    isSigning,
    openRegistrationDialog,
  } = useSupasafeViewKeyRegistration();

  if (address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              disabled={isDisconnecting}
              className="h-9 border-border bg-card px-3 shadow-[0_1px_2px_rgb(6_44_34_/_0.04)] hover:bg-secondary"
            >
              <span className="size-2 rounded-full bg-brand-tertiary" />
              <span className="text-foreground">
                {truncateAddress(address)}
              </span>
              <ChevronDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="min-w-56 rounded-lg border border-border bg-popover p-1.5 shadow-[0_12px_32px_-4px_rgb(6_44_34_/_0.08),0_2px_6px_rgb(6_44_34_/_0.03)]"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 py-2">
              {connector?.name ?? "Wallet"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={
                isSigning || isCheckingRegistration || isRegistrationInFlight
              }
              className="px-2.5 py-2"
              onClick={openRegistrationDialog}
            >
              {isSigning || isCheckingRegistration ? (
                <Spinner />
              ) : hasViewKeyMismatch ? (
                <TriangleAlertIcon />
              ) : isRegistered ? (
                <CheckIcon />
              ) : (
                <KeyRoundIcon />
              )}
              {isSigning
                ? "Preparing View Key"
                : isRegistered
                  ? "Supasafe View Key Registered"
                  : "Register Supasafe View Key"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="px-2.5 py-2"
              onClick={() => void disconnectAsync()}
            >
              <LogOutIcon />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!readyConnector) {
    return (
      <Button
        className="h-9 border-dashed bg-card/65 px-3.5 text-muted-foreground disabled:opacity-100"
        disabled
        title="Ready Wallet Required"
        variant="outline"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WalletIcon className="size-3.5" />
        </span>
        Ready Wallet Required
      </Button>
    );
  }

  return (
    <Button
      className="h-9 px-3.5 shadow-[0_2px_6px_rgb(6_44_34_/_0.12)]"
      disabled={isConnecting}
      onClick={() => void connectAsync({ connector: readyConnector })}
      title="Connect Ready"
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-primary-foreground/15">
        {isConnecting ? (
          <Spinner className="size-3.5" />
        ) : (
          <WalletIcon className="size-3.5" />
        )}
      </span>
      {isConnecting ? "Connecting Ready" : "Connect Ready"}
    </Button>
  );
}

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
import { useEffect, useRef, useState } from "react";
import {
  useGetSupasafePublicViewKey,
  useRegisterSupasafeViewKey,
} from "@/api/multisig";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const { address, connector } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const {
    publicKey,
    error: viewKeyError,
    isReady,
    isSigning,
    retry,
  } = useSupasafeViewKey();
  const { data: registeredPublicKey, isLoading: isCheckingRegistration } =
    useGetSupasafePublicViewKey(address);
  const { registerSupasafeViewKeyAsync, isPending: isRegistering } =
    useRegisterSupasafeViewKey();
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] =
    useState(false);
  const [registrationError, setRegistrationError] = useState<Error | null>(
    null,
  );
  const autoOpenedFor = useRef<string | null>(null);

  const isRegistered =
    registeredPublicKey !== null && registeredPublicKey !== undefined;
  const hasViewKeyMismatch =
    isRegistered &&
    publicKey !== undefined &&
    registeredPublicKey !== publicKey;
  const isRegistrationInFlight = isRegistering || isSubmittingRegistration;

  useEffect(() => {
    if (!address || !isReady || isCheckingRegistration || isRegistered) return;

    const key = `${address}:${publicKey?.toString()}`;
    if (autoOpenedFor.current === key) return;

    autoOpenedFor.current = key;
    setRegistrationDialogOpen(true);
  }, [address, isCheckingRegistration, isReady, isRegistered, publicKey]);

  async function registerViewKey() {
    if (publicKey === undefined) return;

    setRegistrationError(null);
    setIsSubmittingRegistration(true);
    try {
      await registerSupasafeViewKeyAsync(publicKey);
      setRegistrationDialogOpen(false);
    } catch (reason) {
      setRegistrationError(
        reason instanceof Error
          ? reason
          : new Error("Could not register Supasafe view key."),
      );
    } finally {
      setIsSubmittingRegistration(false);
    }
  }

  if (address) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" disabled={isDisconnecting}>
                <WalletIcon />
                {truncateAddress(address)}
                <ChevronDownIcon />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {connector?.name ?? "Wallet"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={
                  isSigning || isCheckingRegistration || isRegistrationInFlight
                }
                onClick={() => setRegistrationDialogOpen(true)}
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
                  ? "Preparing view key"
                  : isRegistered
                    ? "Supasafe view key registered"
                    : "Register Supasafe view key"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void disconnectAsync()}
              >
                <LogOutIcon />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog
          open={registrationDialogOpen}
          onOpenChange={(open) => {
            if (!isRegistrationInFlight) setRegistrationDialogOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {hasViewKeyMismatch
                  ? "View key mismatch"
                  : "Register Supasafe View Key"}
              </DialogTitle>
              <DialogDescription>
                {hasViewKeyMismatch
                  ? "This browser has a different Supasafe view key than the one already registered for this wallet. Registration is disabled to preserve access to existing multisigs."
                  : viewKeyError
                    ? "Sign the Supasafe message to derive your local view key."
                    : isSigning || !isReady
                      ? "Preparing a local view key from your wallet signature."
                      : isRegistered
                        ? "This wallet is already registered with the Supasafe factory."
                        : "Register the public key used to encrypt this wallet's multisig view-key copies."}
              </DialogDescription>
            </DialogHeader>

            {registrationError ? (
              <p className="text-sm text-destructive">
                {registrationError.message}
              </p>
            ) : null}

            <DialogFooter>
              {viewKeyError ? (
                <Button type="button" onClick={retry} disabled={isSigning}>
                  {isSigning ? <Spinner data-icon="inline-start" /> : null}
                  Sign message
                </Button>
              ) : !hasViewKeyMismatch && !isRegistered ? (
                <Button
                  type="button"
                  onClick={() => void registerViewKey()}
                  disabled={!isReady || isSigning || isRegistrationInFlight}
                >
                  {isRegistrationInFlight ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  {isRegistrationInFlight
                    ? "Registering…"
                    : "Register view key"}
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button disabled={isConnecting}>
            <WalletIcon />
            Connect wallet
            <ChevronDownIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {connectors.length === 0 ? (
          <DropdownMenuItem disabled>No wallet found</DropdownMenuItem>
        ) : (
          connectors.map((wallet) => (
            <DropdownMenuItem
              key={wallet.name}
              disabled={isConnecting}
              onClick={() => void connectAsync({ connector: wallet })}
            >
              <WalletIcon />
              {wallet.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

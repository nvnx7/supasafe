"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";

type RegistrationContextValue = {
  hasViewKeyMismatch: boolean;
  isCheckingRegistration: boolean;
  isRegistered: boolean;
  isRegistrationInFlight: boolean;
  isSigning: boolean;
  openRegistrationDialog: () => void;
};

const RegistrationContext = createContext<RegistrationContextValue | null>(
  null,
);

export function SupasafeViewKeyRegistrationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { address } = useAccount();
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const isRegistrationInFlight = isRegistering || isSubmitting;

  useEffect(() => {
    if (!address || !isReady || isCheckingRegistration || isRegistered) return;

    const key = `${address}:${publicKey?.toString()}`;
    if (autoOpenedFor.current === key) return;

    autoOpenedFor.current = key;
    setDialogOpen(true);
  }, [address, isCheckingRegistration, isReady, isRegistered, publicKey]);

  async function registerViewKey() {
    if (publicKey === undefined) return;

    setRegistrationError(null);
    setIsSubmitting(true);
    try {
      await registerSupasafeViewKeyAsync(publicKey);
      setDialogOpen(false);
    } catch (reason) {
      setRegistrationError(
        reason instanceof Error
          ? reason
          : new Error("Could not register Supasafe view key."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RegistrationContext.Provider
      value={{
        hasViewKeyMismatch,
        isCheckingRegistration,
        isRegistered,
        isRegistrationInFlight,
        isSigning,
        openRegistrationDialog: () => setDialogOpen(true),
      }}
    >
      {children}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!isRegistrationInFlight) setDialogOpen(open);
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
                      : "Before you can use a multisig, you need to register a Supasafe-specific view key."}
            </DialogDescription>
          </DialogHeader>

          {registrationError ? (
            <p className="mx-6 my-5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
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
                {isRegistrationInFlight ? "Registering…" : "Register view key"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RegistrationContext.Provider>
  );
}

export function useSupasafeViewKeyRegistration() {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error(
      "useSupasafeViewKeyRegistration must be used within SupasafeViewKeyRegistrationProvider.",
    );
  }
  return context;
}

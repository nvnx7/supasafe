"use client";

import {
  useAccount,
  useStrk20Balances,
} from "@starknetfoundation/starknet-start-react";
import { ArrowRightIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useCreateMultisigTransferProposal,
  useCreateMultisigWithdrawProposal,
  useGetPublicViewKey,
  useTransferPrivateBalanceToMultisig,
} from "@/api/privacy";
import { useTokenUsdPrices } from "@/api/token-prices";
import { TokenLogo } from "@/components/token-logo";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { getTokenByAddress, tokens } from "@/config/tokens";
import { useMultisigProposalContext } from "@/hooks/use-multisig-proposal-context";
import {
  formatTokenAmount,
  isValidAddress,
  isValidAmount,
  parseTokenAmount,
  type TransactionKind,
  truncateAddress,
} from "@/lib/multisig";
import { calculateUsdValue, formatUsdValue } from "@/utils/prices";

type StandardTransactionKind = Exclude<TransactionKind, "swap">;

const KINDS: Record<
  StandardTransactionKind,
  { needsRecipient: boolean; cta: string; hint: string; recipientLabel: string }
> = {
  deposit: {
    needsRecipient: false,
    cta: "Transfer To Multisig",
    hint: "Transfers shielded tokens from your connected Ready wallet into this multisig. Fund your wallet's private balance first.",
    recipientLabel: "",
  },
  withdraw: {
    needsRecipient: true,
    cta: "Propose withdrawal",
    hint: "Moves funds out of this multisig to a transparent address.",
    recipientLabel: "Destination",
  },
  transfer: {
    needsRecipient: true,
    cta: "Propose transfer",
    hint: "Sends funds from this multisig to another account.",
    recipientLabel: "Recipient",
  },
};

const TOKEN_ITEMS = tokens.map((token) => ({
  value: token.address,
  label: `${token.symbol} - ${token.name}`,
  token,
}));

function isWalletTimeout(reason: unknown) {
  return (
    reason instanceof Error && /timed?\s*out|timeout/i.test(reason.message)
  );
}

function getPrivateTokenBalance(
  balances: { token: string; balance: string }[],
  token: string,
) {
  return BigInt(
    balances.find((entry) => BigInt(entry.token) === BigInt(token))?.balance ??
      "0",
  );
}

export function TransactionForm({ kind }: { kind: StandardTransactionKind }) {
  const { needsRecipient, cta, hint, recipientLabel } = KINDS[kind];
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { address: connectedWalletAddress } = useAccount();
  const tokenUsdPrices = useTokenUsdPrices();
  const { getBalancesAsync, isPending: isFetchingWalletPrivateBalance } =
    useStrk20Balances();
  const {
    multisig,
    owner,
    viewingKey,
    isSupasafeViewKeyReady,
    createProposalParams,
  } = useMultisigProposalContext(multisigAddress);
  const {
    createMultisigWithdrawProposalAsync,
    isPending: isCreatingWithdrawProposal,
    error: withdrawError,
  } = useCreateMultisigWithdrawProposal();
  const {
    createMultisigTransferProposalAsync,
    isPending: isCreatingTransferProposal,
    error: transferError,
  } = useCreateMultisigTransferProposal();
  const { transferPrivateBalanceToMultisigAsync, reset: resetDeposit } =
    useTransferPrivateBalanceToMultisig();
  const {
    data: walletPublicViewKey,
    isLoading: isCheckingWalletRegistration,
    refetch: refetchWalletPublicViewKey,
  } = useGetPublicViewKey(connectedWalletAddress);
  const [token, setToken] = useState(tokens[0]?.address ?? "");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isWalletRegistrationDialogOpen, setWalletRegistrationDialogOpen] =
    useState(false);
  const [walletPrivateBalance, setWalletPrivateBalance] = useState<
    bigint | undefined
  >();
  const [walletPrivateBalanceError, setWalletPrivateBalanceError] =
    useState<Error | null>(null);
  const depositRequest = useRef<Promise<{ transaction_hash: string }> | null>(
    null,
  );
  const getBalancesAsyncRef = useRef(getBalancesAsync);
  const selectedToken = getTokenByAddress(token);
  const isCreatingProposal =
    isCreatingWithdrawProposal || isCreatingTransferProposal;
  const parsedAmount = useMemo(() => {
    if (!selectedToken || !isValidAmount(amount)) return undefined;

    try {
      return parseTokenAmount(amount, selectedToken.decimals);
    } catch {
      return undefined;
    }
  }, [amount, selectedToken]);
  const estimatedUsdValue =
    selectedToken && parsedAmount !== undefined
      ? calculateUsdValue({
          amount: parsedAmount,
          decimals: selectedToken.decimals,
          priceUsd: tokenUsdPrices.data?.[selectedToken.coingeckoPriceId],
        })
      : undefined;
  const amountError = !isValidAmount(amount)
    ? "Enter an amount greater than zero."
    : parsedAmount === undefined
      ? `Enter an amount with at most ${selectedToken?.decimals ?? 0} decimal places.`
      : kind === "deposit" &&
          walletPrivateBalance !== undefined &&
          parsedAmount > walletPrivateBalance
        ? "Amount exceeds your connected wallet's private balance."
        : undefined;
  const recipientError =
    !needsRecipient || isValidAddress(recipient)
      ? undefined
      : "Enter a valid address.";
  const valid = !amountError && !recipientError;

  useEffect(() => {
    getBalancesAsyncRef.current = getBalancesAsync;
  }, [getBalancesAsync]);

  useEffect(() => {
    if (
      kind !== "deposit" ||
      !connectedWalletAddress ||
      isCheckingWalletRegistration ||
      !walletPublicViewKey
    ) {
      setWalletPrivateBalance(undefined);
      setWalletPrivateBalanceError(null);
      return;
    }

    let cancelled = false;
    setWalletPrivateBalance(undefined);
    setWalletPrivateBalanceError(null);

    void getBalancesAsyncRef
      .current([token])
      .then((balances) => {
        if (!cancelled) {
          setWalletPrivateBalance(getPrivateTokenBalance(balances, token));
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setWalletPrivateBalanceError(
            reason instanceof Error
              ? reason
              : new Error(
                  "Could not load the connected wallet's private balance.",
                ),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    connectedWalletAddress,
    isCheckingWalletRegistration,
    kind,
    token,
    walletPublicViewKey,
  ]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || !selectedToken || parsedAmount === undefined) return;

    if (kind === "deposit") {
      if (depositRequest.current) {
        toast.add({
          type: "info",
          title: "Deposit request in progress",
          description: "Check your wallet before starting another deposit.",
        });
        return;
      }

      try {
        if (!connectedWalletAddress) {
          throw new Error("Connect a wallet before depositing.");
        }

        const walletViewKey = await refetchWalletPublicViewKey();
        if (walletViewKey.isError) {
          throw new Error("Could not check this wallet's STRK20 registration.");
        }
        if (!walletViewKey.data) {
          setWalletRegistrationDialogOpen(true);
          return;
        }

        const balances = await getBalancesAsync([token]);
        const availableBalance = getPrivateTokenBalance(balances, token);
        setWalletPrivateBalance(availableBalance);
        if (parsedAmount > availableBalance) {
          throw new Error(
            "Amount exceeds your connected wallet's private balance.",
          );
        }

        const request = transferPrivateBalanceToMultisigAsync({
          token,
          amount: parsedAmount,
          multisigAddress,
        });
        depositRequest.current = request;
        resetDeposit();
        toast.add({
          type: "info",
          title: "Confirm private transfer in your wallet",
          description:
            "Ready will transfer shielded tokens into this multisig.",
        });

        void request
          .then((transaction) => {
            toast.add({
              type: "success",
              title: "Private transfer submitted",
              description: `Transaction ${truncateAddress(transaction.transaction_hash, 10)} submitted.`,
            });
          })
          .catch((reason) => {
            if (isWalletTimeout(reason)) {
              toast.add({
                type: "warning",
                title: "Wallet confirmation timed out",
                description:
                  "Ready did not return a final response. Refresh the private balance before retrying.",
              });
              return;
            }
            toast.add({
              type: "error",
              title: "Deposit failed",
              description:
                reason instanceof Error ? reason.message : "Please try again.",
            });
          })
          .finally(() => {
            depositRequest.current = null;
            resetDeposit();
          });
      } catch (reason) {
        toast.add({
          type: "error",
          title: "Deposit failed",
          description:
            reason instanceof Error ? reason.message : "Please try again.",
        });
      }
      return;
    }

    try {
      const proposalParams = await createProposalParams();
      const proposal = {
        ...proposalParams,
        token,
        tokenSymbol: selectedToken.symbol,
        amount: parsedAmount,
        recipient: recipient.trim(),
      };

      if (kind === "withdraw") {
        await createMultisigWithdrawProposalAsync(proposal);
      } else {
        await createMultisigTransferProposalAsync(proposal);
      }
      toast.add({
        type: "success",
        title:
          kind === "withdraw" ? "Withdrawal proposed" : "Transfer proposed",
        description: "The proposal is ready for owner approvals.",
      });
    } catch (reason) {
      toast.add({
        type: "error",
        title: "Could not create proposal",
        description:
          reason instanceof Error ? reason.message : "Please try again.",
      });
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="w-full">
      <FieldGroup className="gap-7">
        <Field>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor={`${kind}-token`}>Token</FieldLabel>
            <span className="text-xs text-muted-foreground">
              {kind === "deposit"
                ? isCheckingWalletRegistration || isFetchingWalletPrivateBalance
                  ? "Checking private balance..."
                  : !walletPublicViewKey
                    ? "Enable private tokens in Ready"
                    : walletPrivateBalance !== undefined
                      ? `Available: ${formatTokenAmount(walletPrivateBalance, selectedToken?.decimals ?? 18)} ${selectedToken?.symbol ?? ""}`
                      : "Private balance unavailable"
                : "Private balance"}
            </span>
          </div>
          <Select
            items={TOKEN_ITEMS}
            onValueChange={(value) => setToken(value ?? "")}
            value={token}
          >
            <SelectTrigger
              id={`${kind}-token`}
              className="!h-14 w-full px-4 text-base"
            >
              {selectedToken ? (
                <TokenLogo token={selectedToken} className="size-6" />
              ) : null}
              <SelectValue placeholder="Select a token" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TOKEN_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <TokenLogo token={item.token} className="size-5" />
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={submitted && amountError ? true : undefined}>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor={`${kind}-amount`}>Amount</FieldLabel>
            <span className="text-xs text-muted-foreground">
              {kind === "deposit" ? "Transfer" : "Enter"}{" "}
              {selectedToken?.symbol ?? "token"} amount
            </span>
          </div>
          <div className="relative">
            <Input
              aria-invalid={submitted && amountError ? true : undefined}
              autoComplete="off"
              className="h-14 px-4 pr-20 text-lg"
              id={`${kind}-amount`}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.0"
              value={amount}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-muted-foreground">
              {selectedToken?.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              Estimated value:{" "}
              <span className="text-foreground">
                {parsedAmount === undefined
                  ? "$0.00"
                  : `≈ ${formatUsdValue(estimatedUsdValue)}`}
              </span>
            </span>
          </div>
          {submitted && amountError ? (
            <FieldError>{amountError}</FieldError>
          ) : null}
          {kind === "deposit" && walletPrivateBalanceError ? (
            <FieldError>{walletPrivateBalanceError.message}</FieldError>
          ) : null}
        </Field>

        {needsRecipient ? (
          <Field data-invalid={submitted && recipientError ? true : undefined}>
            <FieldLabel htmlFor={`${kind}-recipient`}>
              {recipientLabel}
            </FieldLabel>
            <Input
              aria-invalid={submitted && recipientError ? true : undefined}
              autoComplete="off"
              className="h-14 px-4"
              id={`${kind}-recipient`}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="0x..."
              spellCheck={false}
              value={recipient}
            />
            {submitted && recipientError ? (
              <FieldError>{recipientError}</FieldError>
            ) : null}
          </Field>
        ) : null}

        <FieldDescription className="-mt-1">{hint}</FieldDescription>

        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Estimated network fee</span>
            <span>Calculated in wallet</span>
          </div>
        </div>

        {withdrawError || transferError ? (
          <FieldError>
            {withdrawError instanceof Error
              ? withdrawError.message
              : transferError instanceof Error
                ? transferError.message
                : "Could not create proposal."}
          </FieldError>
        ) : null}

        {kind !== "deposit" && isSupasafeViewKeyReady && !viewingKey ? (
          <FieldError>
            Recover your Supasafe view key before creating a proposal.
          </FieldError>
        ) : null}

        <Button
          className="h-14 w-full text-base"
          disabled={
            isCreatingProposal ||
            (kind !== "deposit" && (!multisig || !owner || !viewingKey))
          }
          type="submit"
        >
          {isCreatingProposal ? <Spinner data-icon="inline-start" /> : null}
          {isCreatingProposal ? "Preparing..." : cta}
          {!isCreatingProposal ? (
            <ArrowRightIcon data-icon="inline-end" />
          ) : null}
        </Button>
      </FieldGroup>

      <Dialog
        open={isWalletRegistrationDialogOpen}
        onOpenChange={setWalletRegistrationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Private Tokens In Ready</DialogTitle>
            <DialogDescription>
              This connected wallet is not registered with the STRK20 privacy
              pool. Open Ready, enable Private Tokens for this account, then
              return here to deposit into the multisig.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setWalletRegistrationDialogOpen(false)}
            >
              I&apos;ve Registered My Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

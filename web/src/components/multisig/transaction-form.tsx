"use client";

import { ArrowRightIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

import {
  useCreateMultisigTransferProposal,
  useCreateMultisigWithdrawProposal,
  useDepositToMultisig,
} from "@/api/privacy";
import { Button } from "@/components/ui/button";
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
  isValidAddress,
  isValidAmount,
  parseTokenAmount,
  type TransactionKind,
  truncateAddress,
} from "@/lib/multisig";

type StandardTransactionKind = Exclude<TransactionKind, "swap">;

const KINDS: Record<
  StandardTransactionKind,
  { needsRecipient: boolean; cta: string; hint: string; recipientLabel: string }
> = {
  deposit: {
    needsRecipient: false,
    cta: "Deposit",
    hint: "Moves funds from the connected wallet into this multisig.",
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
}));

function isWalletTimeout(reason: unknown) {
  return (
    reason instanceof Error && /timed?\s*out|timeout/i.test(reason.message)
  );
}

export function TransactionForm({ kind }: { kind: StandardTransactionKind }) {
  const { needsRecipient, cta, hint, recipientLabel } = KINDS[kind];
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
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
  const { depositToMultisigAsync, reset: resetDeposit } =
    useDepositToMultisig();
  const [token, setToken] = useState(tokens[0]?.address ?? "");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const depositRequest = useRef<Promise<{ transaction_hash: string }> | null>(
    null,
  );
  const selectedToken = getTokenByAddress(token);
  const isCreatingProposal =
    isCreatingWithdrawProposal || isCreatingTransferProposal;
  const amountError = isValidAmount(amount)
    ? undefined
    : "Enter an amount greater than zero.";
  const recipientError =
    !needsRecipient || isValidAddress(recipient)
      ? undefined
      : "Enter a valid address.";
  const valid = !amountError && !recipientError;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || !selectedToken) return;

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
        const request = depositToMultisigAsync({
          token,
          amount: parseTokenAmount(amount, selectedToken.decimals),
          multisigAddress,
        });
        depositRequest.current = request;
        resetDeposit();
        toast.add({
          type: "info",
          title: "Confirm deposit in your wallet",
          description: "The request is ready for wallet confirmation.",
        });

        void request
          .then((transaction) => {
            toast.add({
              type: "success",
              title: "Deposit submitted",
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
        amount: parseTokenAmount(amount, selectedToken.decimals),
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
              Private balance
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
              <SelectValue placeholder="Select a token" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TOKEN_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
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
              Enter {selectedToken?.symbol ?? "token"} amount
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
              <span className="text-foreground">≈ $0.00 USD</span>
            </span>
            <span>Price unavailable</span>
          </div>
          {submitted && amountError ? (
            <FieldError>{amountError}</FieldError>
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
    </form>
  );
}

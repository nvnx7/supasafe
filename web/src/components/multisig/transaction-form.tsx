"use client";

import {
  type UseSignTypedDataArgs,
  useAccount,
  useProvider,
  useSignTypedData,
} from "@starknetfoundation/starknet-start-react";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { ArrowDownIcon } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { Signature } from "starknet";
import {
  useGetEncryptedViewingKey,
  useGetMultisig,
  useGetMultisigViewingPublicKey,
} from "@/api/multisig";
import {
  useCreateMultisigTransferProposal,
  useCreateMultisigWithdrawProposal,
  useDepositToMultisig,
} from "@/api/privacy";
import {
  useCreateMultisigSwapProposal,
  useEkuboSwapQuote,
} from "@/api/privacy/ekubo";
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
import { TOKENS } from "@/config/constants";
import { networkConfig } from "@/config/network";
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";
import {
  formatTokenAmount,
  isValidAddress,
  isValidAmount,
  parseTokenAmount,
  type TransactionKind,
  truncateAddress,
} from "@/lib/multisig";
import { buildApprovalTypedData } from "@/lib/signing";
import { decryptViewKey } from "@/utils/encryption";

const KINDS: Record<
  TransactionKind,
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
  swap: {
    needsRecipient: false,
    cta: "Propose swap",
    hint: "Swaps this multisig's private ETH or STRK balance through Ekubo.",
    recipientLabel: "",
  },
};

const TOKEN_ITEMS = TOKENS.map((token) => ({
  value: token.address,
  label: token.symbol,
}));

function isWalletTimeout(reason: unknown) {
  return (
    reason instanceof Error && /timed?\s*out|timeout/i.test(reason.message)
  );
}

export function TransactionForm({ kind }: { kind: TransactionKind }) {
  const { needsRecipient, cta, hint, recipientLabel } = KINDS[kind];
  const isSwap = kind === "swap";
  const { multisigAddress: address } = useParams<{ multisigAddress: string }>();
  const { address: owner } = useAccount();
  const { provider } = useProvider();
  const { signTypedDataAsync } = useSignTypedData({});
  const { data: multisig } = useGetMultisig(address);
  const { privateKey: supasafeViewKey, isReady: isSupasafeViewKeyReady } =
    useSupasafeViewKey();
  const encryptedKey = useGetEncryptedViewingKey(address, owner);
  const viewingPublicKey = useGetMultisigViewingPublicKey(address);
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
  const {
    createMultisigSwapProposalAsync,
    isPending: isCreatingSwapProposal,
    error: swapError,
  } = useCreateMultisigSwapProposal();
  const { depositToMultisigAsync, reset: resetDeposit } =
    useDepositToMultisig();

  const [token, setToken] = useState(TOKENS[0]?.address ?? "");
  const [amount, setAmount] = useState("");
  const [toToken, setToToken] = useState(TOKENS[1]?.address ?? "");
  const [recipient, setRecipient] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const depositRequest = useRef<Promise<{ transaction_hash: string }> | null>(
    null,
  );

  const multisigViewingKey = useMemo(() => {
    if (
      !supasafeViewKey ||
      !encryptedKey.data ||
      viewingPublicKey.data === undefined
    ) {
      return undefined;
    }

    try {
      const key = decryptViewKey({
        ephemeralPubkey: encryptedKey.data.ephemeralPubkey,
        ciphertext: encryptedKey.data.ciphertext,
        recipientPrivateKey: supasafeViewKey,
      });
      return derivePublicKey(key) === viewingPublicKey.data ? key : undefined;
    } catch {
      return undefined;
    }
  }, [encryptedKey.data, supasafeViewKey, viewingPublicKey.data]);

  const isCreatingProposal =
    isCreatingWithdrawProposal ||
    isCreatingTransferProposal ||
    isCreatingSwapProposal;

  const amountError = isValidAmount(amount)
    ? undefined
    : "Enter an amount greater than zero.";
  const recipientError =
    !needsRecipient || isValidAddress(recipient)
      ? undefined
      : "Enter a valid address.";
  const valid = !amountError && !recipientError;
  const toTokenItems = TOKEN_ITEMS.filter((item) => item.value !== token);
  const selectedToken = TOKENS.find((entry) => entry.address === token);
  const selectedToToken = TOKENS.find((entry) => entry.address === toToken);
  const swapAmount = useMemo(() => {
    if (!isSwap || !selectedToken || amountError) return undefined;

    try {
      return parseTokenAmount(amount, selectedToken.decimals);
    } catch {
      return undefined;
    }
  }, [amount, amountError, isSwap, selectedToken]);
  const deferredSwapAmount = useDeferredValue(swapAmount);
  const swapQuote = useEkuboSwapQuote({
    fromToken: isSwap ? token : undefined,
    toToken: isSwap ? toToken : undefined,
    amount: deferredSwapAmount,
  });
  const swapOutputAmount =
    swapQuote.data && selectedToToken
      ? formatTokenAmount(swapQuote.data.outputAmount, selectedToToken.decimals)
      : deferredSwapAmount
        ? "..."
        : "0";

  function selectSwapFromToken(value: string | null) {
    const nextToken = value ?? "";
    setToken(nextToken);
    if (nextToken === toToken) setToToken(token);
  }

  function switchSwapTokens() {
    setToken(toToken);
    setToToken(token);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;

    if (kind === "deposit") {
      const selectedToken = TOKENS.find((entry) => entry.address === token);
      if (!selectedToken) return;
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
          multisigAddress: address,
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
      if (!multisig || !owner || !multisigViewingKey) {
        return;
      }

      if (!selectedToken) return;

      const provingBlockId = Math.max(
        0,
        (await provider.getBlockNumber()) - 10,
      );
      const proposalParams = {
        multisig,
        owner,
        viewingKey: multisigViewingKey,
        provingBlockId,
        signApproval: async (callSetHash: bigint) =>
          (await signTypedDataAsync(
            buildApprovalTypedData(
              multisig.address,
              callSetHash,
              networkConfig.chainId,
            ) as unknown as UseSignTypedDataArgs,
          )) as Signature,
      };

      if (kind === "withdraw") {
        await createMultisigWithdrawProposalAsync({
          ...proposalParams,
          token,
          tokenSymbol: selectedToken.symbol,
          amount: parseTokenAmount(amount, selectedToken.decimals),
          recipient: recipient.trim(),
        });
      } else if (kind === "transfer") {
        await createMultisigTransferProposalAsync({
          ...proposalParams,
          token,
          tokenSymbol: selectedToken.symbol,
          amount: parseTokenAmount(amount, selectedToken.decimals),
          recipient: recipient.trim(),
        });
      } else if (selectedToToken) {
        await createMultisigSwapProposalAsync({
          ...proposalParams,
          fromToken: token,
          fromTokenSymbol: selectedToken.symbol,
          toToken,
          toTokenSymbol: selectedToToken.symbol,
          amount: parseTokenAmount(amount, selectedToken.decimals),
          minimumReceived: 0n,
        });
      }
      toast.add({
        type: "success",
        title:
          kind === "withdraw"
            ? "Withdrawal proposed"
            : kind === "transfer"
              ? "Transfer proposed"
              : "Swap proposed",
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
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        {isSwap ? (
          <div className="grid gap-3">
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>Powered By</span>
              <Image
                src="/ekubo.svg"
                alt="Ekubo"
                width={90}
                height={16}
                className="h-4 w-auto dark:invert"
              />
            </div>
            <Field
              data-invalid={submitted && amountError ? true : undefined}
              className="grid gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            >
              <div className="grid gap-2">
                <FieldLabel htmlFor="swap-amount">From</FieldLabel>
                <Input
                  id="swap-amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-invalid={submitted && amountError ? true : undefined}
                  className="h-10 border-0 bg-transparent px-0 py-0 text-2xl font-medium shadow-none focus-visible:ring-0 md:text-2xl"
                />
              </div>
              <Select
                items={TOKEN_ITEMS}
                value={token}
                onValueChange={selectSwapFromToken}
              >
                <SelectTrigger
                  id="swap-token"
                  className="min-w-28 bg-background"
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
              {submitted && amountError ? (
                <FieldError className="sm:col-span-2">{amountError}</FieldError>
              ) : null}
            </Field>

            <div className="relative z-10 -my-8 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={switchSwapTokens}
                aria-label="Switch swap tokens"
                title="Switch swap tokens"
                className="size-12 bg-background"
              >
                <ArrowDownIcon />
              </Button>
            </div>

            <Field className="grid gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="grid gap-2">
                <FieldLabel htmlFor="swap-to-token">To</FieldLabel>
                <output
                  aria-live="polite"
                  className="flex h-10 min-w-0 items-center truncate text-2xl font-medium text-muted-foreground"
                >
                  {swapOutputAmount}
                </output>
              </div>
              <Select
                items={toTokenItems}
                value={toToken}
                onValueChange={(value) => setToToken(value ?? "")}
              >
                <SelectTrigger
                  id="swap-to-token"
                  className="min-w-28 bg-background"
                >
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {toTokenItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor={`${kind}-token`}>Token</FieldLabel>
              <Select
                items={TOKEN_ITEMS}
                value={token}
                onValueChange={(value) => setToken(value ?? "")}
              >
                <SelectTrigger id={`${kind}-token`}>
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
              <FieldLabel htmlFor={`${kind}-amount`}>Amount</FieldLabel>
              <Input
                id={`${kind}-amount`}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.0"
                inputMode="decimal"
                autoComplete="off"
                aria-invalid={submitted && amountError ? true : undefined}
              />
              {submitted && amountError ? (
                <FieldError>{amountError}</FieldError>
              ) : null}
            </Field>
          </>
        )}

        {needsRecipient ? (
          <Field data-invalid={submitted && recipientError ? true : undefined}>
            <FieldLabel htmlFor={`${kind}-recipient`}>
              {recipientLabel}
            </FieldLabel>
            <Input
              id={`${kind}-recipient`}
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
              className="font-mono"
              aria-invalid={submitted && recipientError ? true : undefined}
            />
            {submitted && recipientError ? (
              <FieldError>{recipientError}</FieldError>
            ) : null}
          </Field>
        ) : null}

        <FieldDescription>{hint}</FieldDescription>

        {withdrawError || transferError || swapError ? (
          <FieldError>
            {withdrawError instanceof Error
              ? withdrawError.message
              : transferError instanceof Error
                ? transferError.message
                : swapError instanceof Error
                  ? swapError.message
                  : "Could not create proposal."}
          </FieldError>
        ) : null}

        {kind !== "deposit" && isSupasafeViewKeyReady && !multisigViewingKey ? (
          <FieldError>
            Recover your Supasafe view key before creating a proposal.
          </FieldError>
        ) : null}

        <Button
          type="submit"
          disabled={
            isCreatingProposal ||
            (kind !== "deposit" && (!multisig || !owner || !multisigViewingKey))
          }
        >
          {isCreatingProposal ? <Spinner data-icon="inline-start" /> : null}
          {isCreatingProposal ? "Preparing…" : cta}
        </Button>
      </FieldGroup>
    </form>
  );
}

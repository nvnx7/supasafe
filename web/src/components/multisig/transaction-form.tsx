"use client";

import {
  type UseSignTypedDataArgs,
  useAccount,
  useProvider,
  useSignTypedData,
} from "@starknetfoundation/starknet-start-react";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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
  const { depositToMultisigAsync, reset: resetDeposit } =
    useDepositToMultisig();

  const [token, setToken] = useState(TOKENS[0]?.address ?? "");
  const [amount, setAmount] = useState("");
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
      if (!multisig || !owner || !multisigViewingKey || !needsRecipient) {
        return;
      }

      const selectedToken = TOKENS.find((entry) => entry.address === token);
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
        token,
        tokenSymbol: selectedToken.symbol,
        amount: parseTokenAmount(amount, selectedToken.decimals),
        recipient: recipient.trim(),
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
        await createMultisigWithdrawProposalAsync(proposalParams);
      } else {
        await createMultisigTransferProposalAsync(proposalParams);
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
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
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

        {withdrawError || transferError ? (
          <FieldError>
            {withdrawError instanceof Error
              ? withdrawError.message
              : transferError instanceof Error
                ? transferError.message
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

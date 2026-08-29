"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useDepositToMultisig } from "@/api/privacy";
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
import { TOKENS } from "@/config/constants";
import { useProposeTransaction } from "@/hooks/use-propose-transaction";
import {
  isValidAddress,
  isValidAmount,
  parseTokenAmount,
  type TransactionKind,
} from "@/lib/multisig";

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

export function TransactionForm({ kind }: { kind: TransactionKind }) {
  const { needsRecipient, cta, hint, recipientLabel } = KINDS[kind];
  const { multisigAddress: address } = useParams<{ multisigAddress: string }>();
  const { propose, isPending, error } = useProposeTransaction();
  const {
    depositToMultisigAsync,
    isPending: isDepositing,
    error: depositError,
  } = useDepositToMultisig();

  const [token, setToken] = useState(TOKENS[0]?.address ?? "");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [submitted, setSubmitted] = useState(false);

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

      await depositToMultisigAsync({
        token,
        amount: parseTokenAmount(amount, selectedToken.decimals),
        multisigAddress: address,
      });
      return;
    }

    await propose({
      kind,
      multisigAddress: address,
      token,
      amount: amount.trim(),
      ...(needsRecipient ? { recipient: recipient.trim() } : {}),
    });
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

        {error || depositError ? (
          <FieldError>
            {depositError instanceof Error
              ? depositError.message
              : (depositError ?? error)}
          </FieldError>
        ) : null}

        <Button type="submit" disabled={isPending || isDepositing}>
          {isPending || isDepositing ? (
            <Spinner data-icon="inline-start" />
          ) : null}
          {isDepositing ? "Depositing…" : isPending ? "Proposing…" : cta}
        </Button>
      </FieldGroup>
    </form>
  );
}

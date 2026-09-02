"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useCreateMultisigVesuSupplyProposal,
  useCreateMultisigVesuWithdrawProposal,
  useVesuPreviewRedeem,
} from "@/api/privacy/vesu";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { TOKENS } from "@/config/constants";
import { vesuConfig } from "@/config/dapp";
import { useMultisigProposalContext } from "@/hooks/use-multisig-proposal-context";
import {
  formatTokenAmount,
  isValidAmount,
  parseTokenAmount,
} from "@/lib/multisig";

type LendingMode = "supply" | "withdraw";

type LendingVault = {
  underlyingToken: string;
  underlyingSymbol: string;
  underlyingDecimals: number;
  vTokenAddress: string;
  vTokenSymbol: string;
};

function getConfiguredVaults(): LendingVault[] {
  return vesuConfig.vaults.flatMap((vault) => {
    const underlying = TOKENS.find(
      (token) => BigInt(token.address) === BigInt(vault.underlyingTokenAddress),
    );
    if (!underlying) return [];

    return [
      {
        underlyingToken: vault.underlyingTokenAddress,
        underlyingSymbol: underlying.symbol,
        underlyingDecimals: underlying.decimals,
        vTokenAddress: vault.vTokenAddress,
        vTokenSymbol: `v${underlying.symbol}`,
      },
    ];
  });
}

export function LendingForm() {
  const { multisigAddress: address } = useParams<{ multisigAddress: string }>();
  const {
    multisig,
    owner,
    viewingKey: multisigViewingKey,
    isSupasafeViewKeyReady,
    createProposalParams,
  } = useMultisigProposalContext(address);
  const {
    createMultisigVesuSupplyProposalAsync,
    isPending: isCreatingSupplyProposal,
    error: supplyError,
  } = useCreateMultisigVesuSupplyProposal();
  const {
    createMultisigVesuWithdrawProposalAsync,
    isPending: isCreatingWithdrawProposal,
    error: withdrawError,
  } = useCreateMultisigVesuWithdrawProposal();
  const vaults = useMemo(getConfiguredVaults, []);
  const [mode, setMode] = useState<LendingMode>("supply");
  const [underlyingToken, setUnderlyingToken] = useState(
    vaults[0]?.underlyingToken ?? "",
  );
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedVault = vaults.find(
    (vault) => BigInt(vault.underlyingToken) === BigInt(underlyingToken || 0),
  );
  const decimals = mode === "supply" ? selectedVault?.underlyingDecimals : 18;
  const amountError = isValidAmount(amount)
    ? undefined
    : "Enter an amount greater than zero.";
  const rawAmount = useMemo(() => {
    if (!decimals || amountError) return undefined;

    try {
      return parseTokenAmount(amount, decimals);
    } catch {
      return undefined;
    }
  }, [amount, amountError, decimals]);
  const redemptionPreview = useVesuPreviewRedeem({
    vTokenAddress:
      mode === "withdraw" ? selectedVault?.vTokenAddress : undefined,
    shares: mode === "withdraw" ? rawAmount : undefined,
  });
  const isCreatingProposal =
    isCreatingSupplyProposal || isCreatingWithdrawProposal;
  const canCreateProposal = Boolean(
    selectedVault &&
      rawAmount &&
      !amountError &&
      multisig &&
      owner &&
      multisigViewingKey,
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!selectedVault || !rawAmount || amountError) return;

    try {
      const proposalParams = await createProposalParams();

      if (mode === "supply") {
        await createMultisigVesuSupplyProposalAsync({
          ...proposalParams,
          underlyingToken: selectedVault.underlyingToken,
          underlyingTokenSymbol: selectedVault.underlyingSymbol,
          vTokenSymbol: selectedVault.vTokenSymbol,
          amount: rawAmount,
        });
      } else {
        await createMultisigVesuWithdrawProposalAsync({
          ...proposalParams,
          vTokenAddress: selectedVault.vTokenAddress,
          vTokenSymbol: selectedVault.vTokenSymbol,
          underlyingTokenSymbol: selectedVault.underlyingSymbol,
          shares: rawAmount,
        });
      }

      toast.add({
        type: "success",
        title: mode === "supply" ? "Supply proposed" : "Withdrawal proposed",
        description: "The proposal is ready for owner approvals.",
      });
    } catch (reason) {
      toast.add({
        type: "error",
        title: "Could not create lending proposal",
        description:
          reason instanceof Error ? reason.message : "Please try again.",
      });
    }
  }

  if (!vesuConfig.anonymizerAddress || vaults.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Vesu lending is not configured for this network.
      </p>
    );
  }

  const tokenLabel =
    mode === "supply"
      ? selectedVault?.underlyingSymbol
      : selectedVault?.vTokenSymbol;
  const previewAmount =
    redemptionPreview.data && selectedVault
      ? formatTokenAmount(
          redemptionPreview.data,
          selectedVault.underlyingDecimals,
        )
      : "-";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as LendingMode)}
        >
          <TabsList aria-label="Lending action">
            <TabsTrigger value="supply">Supply</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>
        </Tabs>

        <Field>
          <FieldLabel htmlFor="vesu-vault">Vault</FieldLabel>
          <Select
            items={vaults.map((vault) => ({
              value: vault.underlyingToken,
              label: `${vault.underlyingSymbol} / ${vault.vTokenSymbol}`,
            }))}
            value={underlyingToken}
            onValueChange={(value) => setUnderlyingToken(value ?? "")}
          >
            <SelectTrigger id="vesu-vault">
              <SelectValue placeholder="Select a Vesu vault" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {vaults.map((vault) => (
                  <SelectItem
                    key={vault.underlyingToken}
                    value={vault.underlyingToken}
                  >
                    {vault.underlyingSymbol} / {vault.vTokenSymbol}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={submitted && amountError ? true : undefined}>
          <FieldLabel htmlFor="vesu-amount">
            {mode === "supply" ? "Supply" : "Withdraw"} amount
          </FieldLabel>
          <Input
            id="vesu-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.0"
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={submitted && amountError ? true : undefined}
          />
          <FieldDescription>
            {mode === "supply"
              ? `Supplies ${tokenLabel ?? "the underlying asset"} and receives a private ${selectedVault?.vTokenSymbol ?? "vToken"} position.`
              : `Redeems private ${tokenLabel ?? "vToken"} shares for ${selectedVault?.underlyingSymbol ?? "the underlying asset"}.`}
          </FieldDescription>
          {submitted && amountError ? (
            <FieldError>{amountError}</FieldError>
          ) : null}
        </Field>

        {mode === "withdraw" ? (
          <Field>
            <FieldLabel>Estimated received</FieldLabel>
            <output className="text-sm font-medium" aria-live="polite">
              {redemptionPreview.isFetching
                ? "Calculating..."
                : `${previewAmount} ${selectedVault?.underlyingSymbol ?? ""}`}
            </output>
            {redemptionPreview.error ? (
              <FieldError>{redemptionPreview.error.message}</FieldError>
            ) : null}
          </Field>
        ) : null}

        {isSupasafeViewKeyReady && !multisigViewingKey ? (
          <FieldError>
            Recover your Supasafe view key before creating a proposal.
          </FieldError>
        ) : null}

        {supplyError || withdrawError ? (
          <FieldError>
            {supplyError instanceof Error
              ? supplyError.message
              : withdrawError instanceof Error
                ? withdrawError.message
                : "Could not create lending proposal."}
          </FieldError>
        ) : null}

        <Button
          type="submit"
          disabled={isCreatingProposal || !canCreateProposal}
        >
          {isCreatingProposal ? <Spinner data-icon="inline-start" /> : null}
          {isCreatingProposal
            ? "Preparing..."
            : mode === "supply"
              ? "Propose supply"
              : "Propose withdrawal"}
        </Button>
      </FieldGroup>
    </form>
  );
}

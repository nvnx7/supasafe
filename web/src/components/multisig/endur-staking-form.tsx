"use client";

import { ArrowDownIcon, LoaderCircleIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAvnuPrivateSwapQuote } from "@/api/privacy/avnu";
import {
  useCreateMultisigEndurStakeProposal,
  useCreateMultisigEndurUnstakeProposal,
  useEndurDepositPreview,
} from "@/api/privacy/endur";
import { TokenLogo } from "@/components/token-logo";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { avnuConfig, endurConfig } from "@/config/dapp";
import { getTokenByAddress } from "@/config/tokens";
import { useMultisigProposalContext } from "@/hooks/use-multisig-proposal-context";
import {
  formatTokenAmount,
  isValidAmount,
  parseTokenAmount,
} from "@/lib/multisig";

type EndurMode = "stake" | "unstake";

export function EndurStakingForm() {
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const {
    multisig,
    owner,
    viewingKey,
    isSupasafeViewKeyReady,
    createProposalParams,
    strk20Balances,
    getPrivateBalance,
  } = useMultisigProposalContext(multisigAddress);
  const [mode, setMode] = useState<EndurMode>("stake");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const {
    createMultisigEndurStakeProposalAsync,
    isPending: isCreatingStakeProposal,
    error: stakeError,
  } = useCreateMultisigEndurStakeProposal();
  const {
    createMultisigEndurUnstakeProposalAsync,
    isPending: isCreatingUnstakeProposal,
    error: unstakeError,
  } = useCreateMultisigEndurUnstakeProposal();
  const isEndurConfigured = Boolean(
    endurConfig.anonymizerAddress &&
      endurConfig.strkTokenAddress &&
      endurConfig.xStrkTokenAddress,
  );
  const inputToken = getTokenByAddress(
    mode === "stake"
      ? endurConfig.strkTokenAddress
      : endurConfig.xStrkTokenAddress,
  );
  const outputToken = getTokenByAddress(
    mode === "stake"
      ? endurConfig.xStrkTokenAddress
      : endurConfig.strkTokenAddress,
  );
  const availableBalance = getPrivateBalance(inputToken?.address);
  const amountError = isValidAmount(amount)
    ? undefined
    : "Enter an amount greater than zero.";
  const rawAmount = useMemo(() => {
    if (!inputToken || amountError) return undefined;

    try {
      return parseTokenAmount(amount, inputToken.decimals);
    } catch {
      return undefined;
    }
  }, [amount, amountError, inputToken]);
  const depositPreview = useEndurDepositPreview(
    mode === "stake" ? rawAmount : undefined,
  );
  const unstakeQuote = useAvnuPrivateSwapQuote({
    sellTokenAddress:
      mode === "unstake" && isEndurConfigured
        ? endurConfig.xStrkTokenAddress
        : undefined,
    buyTokenAddress:
      mode === "unstake" && isEndurConfigured
        ? endurConfig.strkTokenAddress
        : undefined,
    sellAmount: mode === "unstake" ? rawAmount : undefined,
    takerAddress: multisig?.address,
  });
  const isAvnuConfigured = Boolean(
    avnuConfig.baseUrl && avnuConfig.paymasterBaseUrl,
  );
  const isCreatingProposal =
    isCreatingStakeProposal || isCreatingUnstakeProposal;
  const expectedOutput =
    mode === "stake" ? depositPreview.data : unstakeQuote.data?.buyAmount;
  const canCreateProposal = Boolean(
    isEndurConfigured &&
      multisig &&
      owner &&
      viewingKey &&
      rawAmount &&
      !amountError &&
      (mode === "stake" ? depositPreview.data : unstakeQuote.data),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!canCreateProposal || !rawAmount) return;

    try {
      const proposalParams = await createProposalParams();
      if (mode === "stake") {
        await createMultisigEndurStakeProposalAsync({
          ...proposalParams,
          amount: rawAmount,
        });
      } else if (unstakeQuote.data) {
        await createMultisigEndurUnstakeProposalAsync({
          ...proposalParams,
          quote: unstakeQuote.data,
          slippage: 0.01,
          feeMode: {
            poolFeeToken: endurConfig.strkTokenAddress,
            tip: "normal",
          },
        });
      }

      toast.add({
        type: "success",
        title: mode === "stake" ? "Stake proposed" : "Unstake proposed",
        description: "The proposal is ready for owner approvals.",
      });
      setAmount("");
      setSubmitted(false);
    } catch (reason) {
      toast.add({
        type: "error",
        title: "Could not create Endur proposal",
        description:
          reason instanceof Error ? reason.message : "Please try again.",
      });
    }
  }

  const unavailableLabel = !isEndurConfigured
    ? "Endur is unavailable on this network"
    : mode === "unstake" && !isAvnuConfigured
      ? "Instant unstaking is unavailable on this network"
      : undefined;
  const outputAmount = expectedOutput
    ? formatTokenAmount(expectedOutput, outputToken?.decimals ?? 18)
    : "0";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="gap-7">
        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value as EndurMode);
            setAmount("");
            setSubmitted(false);
          }}
        >
          <TabsList aria-label="Endur action">
            <TabsTrigger value="stake">Stake</TabsTrigger>
            <TabsTrigger value="unstake">Unstake</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4">
          <Field
            className="grid gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            data-invalid={submitted && amountError ? true : undefined}
          >
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="endur-amount">
                  {mode === "stake" ? "You Stake" : "You Unstake"}
                </FieldLabel>
                <span className="text-xs text-muted-foreground">
                  {strk20Balances.isFetching
                    ? "Checking..."
                    : availableBalance !== undefined
                      ? `Available: ${formatTokenAmount(availableBalance, inputToken?.decimals ?? 18)} ${inputToken?.symbol ?? ""}`
                      : "Balance unavailable"}
                </span>
              </div>
              <Input
                aria-invalid={submitted && amountError ? true : undefined}
                autoComplete="off"
                className="h-10 border-0 bg-transparent px-0 py-0 text-3xl shadow-none focus-visible:ring-0 md:text-3xl"
                disabled={Boolean(unavailableLabel)}
                id="endur-amount"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                value={amount}
              />
            </div>
            <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium">
              {inputToken ? (
                <TokenLogo token={inputToken} className="size-5" />
              ) : null}
              {inputToken?.symbol ?? "Token"}
            </div>
            {submitted && amountError ? (
              <FieldError>{amountError}</FieldError>
            ) : null}
          </Field>

          <div className="relative z-10 -my-7 flex justify-center">
            <span className="flex size-14 items-center justify-center rounded-lg border bg-card text-brand-secondary shadow-sm">
              <ArrowDownIcon className="size-5" />
            </span>
          </div>

          <Field className="grid gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-2">
              <FieldLabel>You Receive</FieldLabel>
              <output
                aria-live="polite"
                className="text-3xl text-muted-foreground"
              >
                {outputAmount}
              </output>
            </div>
            <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium">
              {outputToken ? (
                <TokenLogo token={outputToken} className="size-5" />
              ) : null}
              {outputToken?.symbol ?? "Token"}
            </div>
            <FieldDescription className="sm:col-span-2">
              {mode === "stake"
                ? "Private STRK is converted into yield-bearing private xSTRK."
                : "Private xSTRK is exchanged for private STRK through AVNU."}
            </FieldDescription>
            {depositPreview.error ? (
              <FieldError className="sm:col-span-2">
                {depositPreview.error.message}
              </FieldError>
            ) : null}
            {unstakeQuote.error ? (
              <FieldError className="sm:col-span-2">
                Unable to quote an instant xSTRK exit.
              </FieldError>
            ) : null}
          </Field>
        </div>

        {isSupasafeViewKeyReady && !viewingKey ? (
          <FieldError>
            Recover your Supasafe view key before creating a proposal.
          </FieldError>
        ) : null}
        {stakeError || unstakeError ? (
          <FieldError>
            {(stakeError ?? unstakeError)?.message ??
              "Could not create an Endur proposal."}
          </FieldError>
        ) : null}

        <Button
          className="h-14 w-full text-base"
          disabled={
            Boolean(unavailableLabel) ||
            !canCreateProposal ||
            isCreatingProposal
          }
          type="submit"
        >
          {isCreatingProposal ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : null}
          {unavailableLabel ??
            (isCreatingProposal
              ? "Preparing..."
              : mode === "stake"
                ? "Propose Stake"
                : "Propose Instant Unstake")}
        </Button>
      </FieldGroup>
    </form>
  );
}

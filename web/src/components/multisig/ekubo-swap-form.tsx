"use client";

import { ArrowDownIcon, LoaderCircleIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import {
  useCreateMultisigSwapProposal,
  useEkuboSwapQuote,
} from "@/api/privacy/ekubo";
import { TokenLogo } from "@/components/token-logo";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ekuboConfig } from "@/config/dapp";
import { getTokenByAddress, tokens } from "@/config/tokens";
import { useMultisigProposalContext } from "@/hooks/use-multisig-proposal-context";
import {
  formatTokenAmount,
  isValidAmount,
  parseTokenAmount,
} from "@/lib/multisig";

const TOKEN_ITEMS = tokens.map((token) => ({
  label: token.symbol,
  value: token.address,
  token,
}));

function getToken(address: string) {
  const token = getTokenByAddress(address);
  if (!token) {
    throw new Error("Unsupported token.");
  }
  return token;
}

export function EkuboSwapForm() {
  const params = useParams<{ multisigAddress: string }>();
  const multisigAddress = params.multisigAddress;
  const {
    multisig,
    owner,
    viewingKey,
    isSupasafeViewKeyReady,
    createProposalParams,
  } = useMultisigProposalContext(multisigAddress);
  const [tokenAddress, setTokenAddress] = useState(tokens[0]?.address ?? "");
  const [toTokenAddress, setToTokenAddress] = useState(
    tokens[1]?.address ?? "",
  );
  const [amount, setAmount] = useState("");
  const deferredAmount = useDeferredValue(amount);
  const { createMultisigSwapProposalAsync, isPending } =
    useCreateMultisigSwapProposal();

  const token = getToken(tokenAddress);
  const toToken = getToken(toTokenAddress);
  const parsedAmount = useMemo(() => {
    if (!isValidAmount(deferredAmount)) return undefined;

    try {
      return parseTokenAmount(deferredAmount, token.decimals);
    } catch {
      return undefined;
    }
  }, [deferredAmount, token.decimals]);
  const quote = useEkuboSwapQuote({
    fromToken: token.address,
    toToken: toToken.address,
    amount: parsedAmount,
  });
  const receivedAmount = quote.data
    ? formatTokenAmount(quote.data.outputAmount, toToken.decimals)
    : "0";
  const isConfigured = Boolean(
    ekuboConfig.coreAddress &&
      ekuboConfig.routerAddress &&
      ekuboConfig.executorAddress &&
      ekuboConfig.pools.length,
  );
  const canCreateProposal = Boolean(
    multisig &&
      owner &&
      viewingKey &&
      isSupasafeViewKeyReady &&
      isValidAmount(amount) &&
      quote.data,
  );

  async function submit() {
    if (!canCreateProposal || !quote.data) {
      return;
    }

    try {
      const proposalParams = await createProposalParams();
      await createMultisigSwapProposalAsync({
        ...proposalParams,
        fromToken: token.address,
        fromTokenSymbol: token.symbol,
        toToken: toToken.address,
        toTokenSymbol: toToken.symbol,
        amount: parseTokenAmount(amount, token.decimals),
        minimumReceived: 0n,
      });
      toast.add({
        type: "success",
        title: "Ekubo swap proposed",
        description: "The proposal is ready for owner approvals.",
      });
      setAmount("");
    } catch (error) {
      toast.add({
        type: "error",
        title: "Could not create swap proposal",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  if (!isConfigured) {
    return (
      <Button className="h-14 w-full text-base" disabled type="button">
        Ekubo swaps are unavailable on this network
      </Button>
    );
  }

  return (
    <div className="grid gap-4">
      <Field className="grid gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <FieldLabel htmlFor="ekubo-sell-amount">From</FieldLabel>
          <Input
            className="h-10 border-0 bg-transparent px-0 py-0 text-2xl shadow-none focus-visible:ring-0"
            id="ekubo-sell-amount"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            value={amount}
          />
        </div>
        <Select
          items={TOKEN_ITEMS}
          onValueChange={(value) => setTokenAddress(value ?? "")}
          value={token.address}
        >
          <SelectTrigger
            aria-label="Sell token"
            className="!h-10 w-full sm:w-36"
          >
            <TokenLogo token={token} className="size-5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOKEN_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <TokenLogo token={item.token} className="size-5" />
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="relative z-10 -my-7 flex justify-center">
        <Button
          aria-label="Switch tokens"
          className="size-14 rounded-lg"
          onClick={() => {
            setTokenAddress(toToken.address);
            setToTokenAddress(token.address);
          }}
          size="icon"
          type="button"
          variant="secondary"
        >
          <ArrowDownIcon />
        </Button>
      </div>

      <Field className="grid gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <FieldLabel htmlFor="ekubo-buy-amount">To</FieldLabel>
          <Input
            className="h-10 border-0 bg-transparent px-0 py-0 text-2xl text-muted-foreground shadow-none focus-visible:ring-0"
            id="ekubo-buy-amount"
            readOnly
            value={receivedAmount}
          />
        </div>
        <Select
          items={TOKEN_ITEMS}
          onValueChange={(value) => setToTokenAddress(value ?? "")}
          value={toToken.address}
        >
          <SelectTrigger
            aria-label="Buy token"
            className="!h-10 w-full sm:w-36"
          >
            <TokenLogo token={toToken} className="size-5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOKEN_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <TokenLogo token={item.token} className="size-5" />
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {quote.isError ? (
        <p className="text-sm text-destructive">Unable to quote this swap.</p>
      ) : null}

      <Button
        className="h-14 w-full text-base"
        disabled={!canCreateProposal || isPending}
        onClick={submit}
        type="button"
      >
        {isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
        Create swap proposal
      </Button>
    </div>
  );
}

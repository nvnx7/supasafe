"use client";

import { ArrowDownIcon, LoaderCircleIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import {
  useAvnuPrivateSwapQuote,
  useCreateMultisigAvnuPrivateSwapProposal,
} from "@/api/privacy/avnu";
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
import { avnuConfig } from "@/config/dapp";
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
}));

function getToken(address: string) {
  const token = getTokenByAddress(address);
  if (!token) {
    throw new Error("Unsupported token.");
  }
  return token;
}

export function AvnuSwapForm() {
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
  const [feeTokenAddress, setFeeTokenAddress] = useState(
    tokens[1]?.address ?? "",
  );
  const [slippage, setSlippage] = useState("0.01");
  const [amount, setAmount] = useState("");
  const deferredAmount = useDeferredValue(amount);
  const { createMultisigAvnuPrivateSwapProposalAsync, isPending } =
    useCreateMultisigAvnuPrivateSwapProposal();

  const token = getToken(tokenAddress);
  const toToken = getToken(toTokenAddress);
  const feeToken = getToken(feeTokenAddress);
  const parsedAmount = useMemo(() => {
    if (!isValidAmount(deferredAmount)) return undefined;

    try {
      return parseTokenAmount(deferredAmount, token.decimals);
    } catch {
      return undefined;
    }
  }, [deferredAmount, token.decimals]);
  const quote = useAvnuPrivateSwapQuote({
    sellTokenAddress: token.address,
    buyTokenAddress: toToken.address,
    sellAmount: parsedAmount,
    takerAddress: multisig?.address,
  });
  const receivedAmount = quote.data
    ? formatTokenAmount(quote.data.buyAmount, toToken.decimals)
    : "0";
  const isConfigured = Boolean(
    avnuConfig.baseUrl && avnuConfig.paymasterBaseUrl,
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
      await createMultisigAvnuPrivateSwapProposalAsync({
        ...proposalParams,
        quote: quote.data,
        sellTokenSymbol: token.symbol,
        buyTokenSymbol: toToken.symbol,
        slippage: Number(slippage),
        feeMode: {
          poolFeeToken: feeToken.address,
          tip: "normal",
        },
      });
      toast.add({
        type: "success",
        title: "AVNU swap proposed",
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
      <p className="text-sm text-muted-foreground">
        AVNU is not configured for this network yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-right text-xs text-muted-foreground">
        Powered by AVNU
      </p>

      <Field className="grid gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <FieldLabel htmlFor="avnu-sell-amount">From</FieldLabel>
          <Input
            className="h-10 border-0 bg-transparent px-0 py-0 text-2xl shadow-none focus-visible:ring-0"
            id="avnu-sell-amount"
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
          <SelectTrigger aria-label="Sell token" className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOKEN_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
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
          <FieldLabel htmlFor="avnu-buy-amount">To</FieldLabel>
          <Input
            className="h-10 border-0 bg-transparent px-0 py-0 text-2xl text-muted-foreground shadow-none focus-visible:ring-0"
            id="avnu-buy-amount"
            readOnly
            value={receivedAmount}
          />
        </div>
        <Select
          items={TOKEN_ITEMS}
          onValueChange={(value) => setToTokenAddress(value ?? "")}
          value={toToken.address}
        >
          <SelectTrigger aria-label="Buy token" className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOKEN_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="grid gap-2">
          <FieldLabel htmlFor="avnu-fee-token">Pool fee token</FieldLabel>
          <Select
            items={TOKEN_ITEMS}
            onValueChange={(value) => setFeeTokenAddress(value ?? "")}
            value={feeToken.address}
          >
            <SelectTrigger id="avnu-fee-token">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOKEN_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="grid gap-2">
          <FieldLabel htmlFor="avnu-slippage">Slippage</FieldLabel>
          <Select
            onValueChange={(value) => setSlippage(value ?? "0.01")}
            value={slippage}
          >
            <SelectTrigger id="avnu-slippage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.005">0.5%</SelectItem>
              <SelectItem value="0.01">1%</SelectItem>
              <SelectItem value="0.03">3%</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {quote.isError ? (
        <p className="text-sm text-destructive">Unable to quote this swap.</p>
      ) : null}

      <Button
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

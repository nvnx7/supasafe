"use client";

import {
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGetMultisig } from "@/api/multisig";
import { AvnuSwapForm } from "@/components/multisig/avnu-swap-form";
import { EkuboSwapForm } from "@/components/multisig/ekubo-swap-form";
import { LendingForm } from "@/components/multisig/lending-form";
import { TransactionForm } from "@/components/multisig/transaction-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TransactionKind } from "@/lib/multisig";

type PaymentTab = Exclude<TransactionKind, "swap">;
type Dapp = "payments" | "avnu" | "ekubo" | "vesu" | "endur";

const PAYMENT_TABS: { value: PaymentTab; label: string }[] = [
  { value: "deposit", label: "Deposit" },
  { value: "withdraw", label: "Withdraw" },
  { value: "transfer", label: "Transfer" },
];

const DAPPS: {
  value: Dapp;
  label: string;
  description: string;
  logo?: string;
}[] = [
  {
    value: "payments",
    label: "Payments",
    description: "Private Transfers",
  },
  {
    value: "avnu",
    label: "Avnu",
    description: "Private Swap",
    logo: "/logo-avnu.svg",
  },
  {
    value: "ekubo",
    label: "Ekubo",
    description: "Private Swap",
    logo: "/logo-ekubo.webp",
  },
  {
    value: "vesu",
    label: "Vesu",
    description: "Private Lending",
    logo: "/logo-vesu.webp",
  },
  {
    value: "endur",
    label: "Endur",
    description: "Coming Soon",
    logo: "/logo-endur.png",
  },
];

function getPaymentTab(value: string | null): PaymentTab {
  return PAYMENT_TABS.some((tab) => tab.value === value)
    ? (value as PaymentTab)
    : "deposit";
}

function getDapp(value: string | null, tab: string | null): Dapp {
  if (DAPPS.some((dapp) => dapp.value === value)) return value as Dapp;
  if (tab === "swap") return "avnu";
  if (tab === "lend") return "vesu";
  return "payments";
}

function getDappCopy(dapp: Dapp) {
  switch (dapp) {
    case "payments":
      return {
        title: "New Transaction",
        description:
          "Move private funds or create a proposal for owner approval.",
      };
    case "avnu":
      return {
        title: "Private Swap",
        description: "Create a private swap proposal routed through AVNU.",
      };
    case "ekubo":
      return {
        title: "Private Swap",
        description: "Create a private swap proposal routed through Ekubo.",
      };
    case "vesu":
      return {
        title: "Private Lending",
        description: "Supply or redeem private positions through Vesu.",
      };
    case "endur":
      return {
        title: "Endur",
        description: "Private Endur strategies will be available here soon.",
      };
  }
}

export function TransactionPanel() {
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { data: multisig } = useGetMultisig(multisigAddress);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedDapp = searchParams.get("dapp");
  const [activeDapp, setActiveDapp] = useState<Dapp>(() =>
    getDapp(requestedDapp, requestedTab),
  );
  const [activePaymentTab, setActivePaymentTab] = useState<PaymentTab>(() =>
    getPaymentTab(requestedTab),
  );

  useEffect(() => {
    setActiveDapp(getDapp(requestedDapp, requestedTab));
    setActivePaymentTab(getPaymentTab(requestedTab));
  }, [requestedDapp, requestedTab]);

  const { title, description } = getDappCopy(activeDapp);

  return (
    <div>
      <div className="mb-4 flex items-center text-sm text-muted-foreground">
        <Link
          href={`/${multisigAddress}`}
          className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-brand-secondary"
        >
          <ArrowLeftIcon className="size-4" />
          Back to overview
        </Link>
      </div>

      <div className="grid grid-cols-[260px_minmax(0,700px)] justify-center gap-5">
        <aside className="h-fit rounded-lg border bg-card p-4 shadow-[0_10px_28px_-22px_rgb(6_44_34_/_0.3)]">
          <div className="border-b px-2 pb-4">
            <p className="text-xs text-muted-foreground">Supasafe Apps</p>
            <p className="mt-1 text-sm font-medium">Private Finance</p>
          </div>
          <nav className="grid gap-1" aria-label="Transaction Apps">
            {DAPPS.map((dapp) => {
              const selected = activeDapp === dapp.value;
              return (
                <button
                  key={dapp.value}
                  type="button"
                  className={`group mt-3 flex min-h-16 w-full items-center gap-3 rounded-md border px-3 text-left transition-all ${
                    selected
                      ? "border-brand-tertiary/35 bg-secondary text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground"
                  }`}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => setActiveDapp(dapp.value)}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md ring-1 ring-border ${
                      selected ? "bg-card" : "bg-background"
                    }`}
                  >
                    {dapp.value === "payments" ? (
                      <ArrowLeftRightIcon className="size-4 text-brand-secondary" />
                    ) : dapp.value === "endur" ? (
                      <Image
                        alt=""
                        className="size-7 rounded-full object-contain"
                        height={28}
                        src={dapp.logo as string}
                        unoptimized
                        width={28}
                      />
                    ) : (
                      <Image
                        alt=""
                        className="size-6 object-contain"
                        height={24}
                        src={dapp.logo as string}
                        width={24}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {dapp.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {dapp.description}
                    </span>
                  </span>
                  <ChevronRightIcon
                    className={`size-4 shrink-0 transition-transform ${
                      selected
                        ? "text-brand-secondary"
                        : "text-muted-foreground/60 group-hover:translate-x-0.5"
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        </aside>

        <Card className="min-w-0 [--card-spacing:--spacing(0)]">
          <div className="p-6 pb-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
              <Badge variant="secondary" className="h-8 px-3 text-xs uppercase">
                {multisig
                  ? `${multisig.threshold}-of-${multisig.owners.length} multisig`
                  : "Multisig"}
              </Badge>
            </div>

            {activeDapp === "payments" ? (
              <Tabs
                value={activePaymentTab}
                onValueChange={(value) =>
                  setActivePaymentTab(value as PaymentTab)
                }
                className="mt-7"
              >
                <TabsList
                  aria-label="Payment type"
                  className="grid h-13 w-full grid-cols-3 bg-muted p-1"
                >
                  {PAYMENT_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : null}
          </div>
          <Separator />
          <CardContent className="px-6 py-8">
            {activeDapp === "payments" ? (
              <TransactionForm kind={activePaymentTab} />
            ) : activeDapp === "avnu" ? (
              <AvnuSwapForm />
            ) : activeDapp === "ekubo" ? (
              <EkuboSwapForm />
            ) : activeDapp === "vesu" ? (
              <LendingForm />
            ) : (
              <div className="flex min-h-76 flex-col items-center justify-center gap-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-md bg-secondary text-brand-secondary">
                  <SparklesIcon className="size-5" />
                </span>
                <div>
                  <p className="text-base font-medium">Coming Soon</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Private Endur strategies are being prepared for Supasafe.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

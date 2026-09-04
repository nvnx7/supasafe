"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGetMultisig } from "@/api/multisig";
import { LendingForm } from "@/components/multisig/lending-form";
import { SwapPanel } from "@/components/multisig/swap-panel";
import { TransactionForm } from "@/components/multisig/transaction-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TransactionKind } from "@/lib/multisig";

type TransactionPanelTab = TransactionKind | "lend";

const TABS: { value: TransactionPanelTab; label: string }[] = [
  { value: "deposit", label: "Deposit" },
  { value: "withdraw", label: "Withdraw" },
  { value: "transfer", label: "Transfer" },
  { value: "swap", label: "Swap" },
  { value: "lend", label: "Lend" },
];

function getTransactionTab(value: string | null): TransactionPanelTab {
  return TABS.some((tab) => tab.value === value)
    ? (value as TransactionPanelTab)
    : "deposit";
}

export function TransactionPanel() {
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const { data: multisig } = useGetMultisig(multisigAddress);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TransactionPanelTab>(() =>
    getTransactionTab(requestedTab),
  );

  useEffect(() => {
    setActiveTab(getTransactionTab(requestedTab));
  }, [requestedTab]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TransactionPanelTab)}
      className="block"
    >
      <div className="mb-4 flex items-center text-sm text-muted-foreground">
        <Link
          href={`/${multisigAddress}`}
          className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-brand-secondary"
        >
          <ArrowLeftIcon className="size-4" />
          Back to overview
        </Link>
      </div>

      <Card className="[--card-spacing:--spacing(0)]">
        <div className="p-6 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">New transaction</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Move private funds or create a proposal for owner approval.
              </p>
            </div>
            <Badge variant="secondary" className="h-8 px-3 text-xs uppercase">
              {multisig
                ? `${multisig.threshold}-of-${multisig.owners.length} multisig`
                : "Multisig"}
            </Badge>
          </div>

          <div className="mt-7 overflow-x-auto">
            <TabsList
              aria-label="Transaction type"
              className="grid h-13 min-w-135 w-full grid-cols-5 bg-muted p-1"
            >
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        <Separator />
        <CardContent className="px-6 py-8">
          <TabsContent value={activeTab}>
            {activeTab === "lend" ? (
              <LendingForm />
            ) : activeTab === "swap" ? (
              <SwapPanel />
            ) : (
              <TransactionForm kind={activeTab} />
            )}
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}

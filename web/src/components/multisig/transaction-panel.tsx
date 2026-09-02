"use client";

import { useState } from "react";
import { LendingForm } from "@/components/multisig/lending-form";
import { TransactionForm } from "@/components/multisig/transaction-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function TransactionPanel() {
  const [activeTab, setActiveTab] = useState<TransactionPanelTab>("deposit");

  return (
    <Card>
      <CardHeader>
        <CardTitle>New transaction</CardTitle>
        <CardDescription>
          Deposits use the connected wallet. Other transactions collect owner
          signatures until the threshold is met.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TransactionPanelTab)}
          className="flex flex-col gap-6"
        >
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeTab}>
            {activeTab === "lend" ? (
              <LendingForm />
            ) : (
              <TransactionForm kind={activeTab} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

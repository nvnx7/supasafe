"use client";

import { useState } from "react";
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

const TABS: { value: TransactionKind; label: string }[] = [
  { value: "deposit", label: "Deposit" },
  { value: "withdraw", label: "Withdraw" },
  { value: "transfer", label: "Transfer" },
  { value: "swap", label: "Swap" },
];

export function TransactionPanel() {
  const [activeKind, setActiveKind] = useState<TransactionKind>("deposit");

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
          value={activeKind}
          onValueChange={(value) => setActiveKind(value as TransactionKind)}
          className="flex flex-col gap-6"
        >
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeKind}>
            <TransactionForm kind={activeKind} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

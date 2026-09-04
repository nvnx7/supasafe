"use client";

import {
  ArrowDownToLineIcon,
  ArrowLeftRightIcon,
  ArrowUpFromLineIcon,
  ChartNoAxesCombinedIcon,
  type LucideIcon,
  SendIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type MultisigAction = "deposit" | "transfer" | "withdraw" | "swap" | "invest";

const actions: {
  id: MultisigAction;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "deposit", label: "Deposit", icon: ArrowDownToLineIcon },
  { id: "transfer", label: "Transfer", icon: SendIcon },
  { id: "withdraw", label: "Withdraw", icon: ArrowUpFromLineIcon },
  { id: "swap", label: "Swap", icon: ArrowLeftRightIcon },
  { id: "invest", label: "Invest", icon: ChartNoAxesCombinedIcon },
];

function handleAction(_action: MultisigAction) {}

export function MultisigActions() {
  return (
    <nav aria-label="Multisig actions" className="grid grid-cols-5 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <div
            key={action.id}
            className="flex min-w-0 flex-col items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label={action.label}
              onClick={() => handleAction(action.id)}
            >
              <Icon data-icon="inline-start" />
            </Button>
            <span className="text-center text-xs font-medium">
              {action.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

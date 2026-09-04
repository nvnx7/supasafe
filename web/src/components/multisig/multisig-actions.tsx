"use client";

import {
  ArrowDownToLineIcon,
  ArrowLeftRightIcon,
  ArrowUpFromLineIcon,
  ChartNoAxesCombinedIcon,
  type LucideIcon,
  SendIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
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

export function MultisigActions() {
  const { multisigAddress } = useParams<{ multisigAddress: string }>();
  const router = useRouter();

  function handleAction(action: MultisigAction) {
    const tab = action === "invest" ? "lend" : action;
    router.push(`/${multisigAddress}/tx?tab=${tab}`);
  }

  return (
    <nav
      aria-label="Multisig actions"
      className="flex flex-wrap justify-center gap-x-5 gap-y-5"
    >
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <div
            key={action.id}
            className="flex w-14 flex-col items-center gap-2"
          >
            <Button
              type="button"
              variant="default"
              size="icon-xl"
              className="w-full rounded-full"
              aria-label={action.label}
              onClick={() => handleAction(action.id)}
            >
              <Icon data-icon="inline-start" />
            </Button>
            <span className="text-center text-xs font-medium text-muted-foreground">
              {action.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

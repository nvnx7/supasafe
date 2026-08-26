"use client";

import { useAccount } from "@starknet-start/react";
import { CircleCheckIcon, ShieldCheckIcon, ShieldPlusIcon } from "lucide-react";
import { useState } from "react";
import { useGetPublicViewKey, useRegister } from "@/api/privacy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";

export function PrivacyAccountMenu() {
  const { address } = useAccount();
  const [dialogOpen, setDialogOpen] = useState(false);
  const registration = useGetPublicViewKey(address);
  const register = useRegister({ viewingKey: "" });
  const isRegistered = Boolean(registration.data);
  const error = register.error instanceof Error ? register.error.message : null;

  if (!address) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Privacy account actions"
            />
          }
        >
          <ShieldCheckIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {isRegistered ? (
              <DropdownMenuItem disabled>
                <CircleCheckIcon />
                Registered with privacy pool
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                <ShieldPlusIcon />
                Register account
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register privacy account</DialogTitle>
          <DialogDescription>
            Register this account with the privacy pool before it can receive
            private balances or participate in private transfers.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            onClick={() => register.mutate()}
            disabled={register.isPending}
          >
            {register.isPending ? <Spinner data-icon="inline-start" /> : null}
            Register account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

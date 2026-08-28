"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
} from "@starknetfoundation/starknet-start-react";
import { ChevronDownIcon, LogOutIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const { address, connector } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();

  if (address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" disabled={isDisconnecting}>
              <WalletIcon />
              {truncateAddress(address)}
              <ChevronDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{connector?.name ?? "Wallet"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => void disconnectAsync()}
            >
              <LogOutIcon />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button disabled={isConnecting}>
            <WalletIcon />
            Connect wallet
            <ChevronDownIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {connectors.length === 0 ? (
          <DropdownMenuItem disabled>No wallet found</DropdownMenuItem>
        ) : (
          connectors.map((wallet) => (
            <DropdownMenuItem
              key={wallet.name}
              disabled={isConnecting}
              onClick={() => void connectAsync({ connector: wallet })}
            >
              <WalletIcon />
              {wallet.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

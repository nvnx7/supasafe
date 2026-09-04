import Link from "next/link";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold text-primary"
        >
          <span className="size-2 rounded-full bg-secondary" />
          supasafe
        </Link>
        <WalletConnectButton />
      </div>
    </header>
  );
}

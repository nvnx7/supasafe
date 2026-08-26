import Link from "next/link";
import { PrivacyAccountMenu } from "@/components/privacy/privacy-account-menu";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Link href="/" className="font-semibold tracking-tight">
          supasafe
        </Link>
        <div className="flex items-center gap-2">
          <WalletConnectButton />
          <PrivacyAccountMenu />
        </div>
      </div>
    </header>
  );
}

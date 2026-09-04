import Link from "next/link";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { SUPASAFE_DOCS_URL } from "@/config/constants";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-heading text-lg font-bold text-primary"
          >
            <span className="size-2 rounded-full bg-secondary" />
            supasafe
          </Link>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-1"
          >
            <Link
              href="/"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
            >
              Home
            </Link>
            {SUPASAFE_DOCS_URL ? (
              <a
                href={SUPASAFE_DOCS_URL}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
              >
                Docs
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="cursor-not-allowed rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground/50"
              >
                Docs
              </span>
            )}
          </nav>
        </div>
        <WalletConnectButton />
      </div>
    </header>
  );
}

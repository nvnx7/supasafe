import Link from "next/link";
import { SUPASAFE_DOCS_URL } from "@/config/constants";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border/80 bg-card/45">
      <div className="mx-auto flex min-h-16 w-full max-w-[1200px] flex-col justify-center gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-0 lg:px-8">
        <p className="text-sm text-muted-foreground">
          Private multisig accounts on Starknet.
        </p>
        <nav aria-label="Footer Navigation" className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Home
          </Link>
          {SUPASAFE_DOCS_URL ? (
            <a
              href={SUPASAFE_DOCS_URL}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Docs
            </a>
          ) : (
            <span
              aria-disabled="true"
              className="cursor-not-allowed text-sm font-medium text-muted-foreground/50"
            >
              Docs
            </span>
          )}
        </nav>
      </div>
    </footer>
  );
}

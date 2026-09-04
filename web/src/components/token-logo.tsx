"use client";

import Image from "next/image";
import { useState } from "react";
import type { Token } from "@/config/tokens";
import { cn } from "@/lib/utils";

export function TokenLogo({
  token,
  className,
}: {
  token: Pick<Token, "symbol" | "logo">;
  className?: string;
}) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const fallback = token.symbol.startsWith("v")
    ? token.symbol.slice(0, 2)
    : token.symbol.slice(0, 1);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-secondary-foreground",
        className,
      )}
    >
      {token.logo && !imageUnavailable ? (
        <Image
          alt={`${token.symbol} logo`}
          className="size-full object-cover"
          height={48}
          onError={() => setImageUnavailable(true)}
          src={token.logo}
          width={48}
        />
      ) : (
        fallback
      )}
    </span>
  );
}

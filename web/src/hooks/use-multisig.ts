"use client";

import { useParams } from "next/navigation";
import type { MultisigDetail } from "@/lib/multisig";

export interface UseMultisigResult {
  /** Address from the route, whether or not it resolves to a real account. */
  address: string;
  /** The resolved account, or `null` while loading or if it does not exist. */
  multisig: MultisigDetail | null;
  isLoading: boolean;
}

/**
 * The multisig named by the current route.
 *
 * Reads the address from the route rather than taking it as a prop, so any
 * component on the page can call this without the page threading it through.
 *
 * The owner set and threshold are placeholders: reading them for real is a pair
 * of `get_owners` / `get_threshold` calls against the account, which needs a
 * configured provider. The shape returned here is what those calls will fill.
 */
export function useMultisig(): UseMultisigResult {
  const params = useParams<{ multisigAddress: string }>();
  const address = params.multisigAddress ?? "";

  // TODO: replace with `get_owners` / `get_threshold` calls on `address`.
  const multisig: MultisigDetail = {
    address,
    owners: [
      "0x1ef15c18599971b7beced415a40f0c7deacfd9b0d1819e03d723d8bc943cfca",
      "0x759ca09377679ecd535a81e83039658bf40959283187c654c5416f439403cf5",
      "0x411494b501a98abd8262b0da1351e17899a0c4ef23dd2f96fec5ba847310b20",
    ],
    threshold: 2,
  };

  return { address, multisig, isLoading: false };
}

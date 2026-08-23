"use client";

import { useParams } from "next/navigation";
import type { MultisigDetail } from "@/lib/multisig";

export interface UseMultisigResult {
  address: string;
  multisig: MultisigDetail | null;
  isLoading: boolean;
}

// Reads the address off the route so components don't have to be passed it.
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

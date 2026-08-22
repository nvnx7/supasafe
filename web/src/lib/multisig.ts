/** Full detail for a single multisig account. */
export interface MultisigDetail {
  address: string;
  /** Owner STARK public keys, in the order the contract stores them. */
  owners: string[];
  /** Signatures required to authorize a transaction. */
  threshold: number;
}

/** Kinds of transaction that can be proposed against a multisig. */
export type TransactionKind = "deposit" | "withdraw" | "transfer";

/** A token the UI can move. */
export interface TokenOption {
  symbol: string;
  address: string;
}

/**
 * Tokens offered in the transaction forms.
 *
 * STRK is the fee token and has the same address on every Starknet network.
 */
export const TOKENS: TokenOption[] = [
  {
    symbol: "STRK",
    address:
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  },
  {
    symbol: "ETH",
    address:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  },
];

/** Whether `value` is shaped like a positive decimal amount. */
export function isValidAmount(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d*\.?\d+$/.test(trimmed)) return false;
  return Number(trimmed) > 0;
}

/** Whether `value` is shaped like a Starknet contract address. */
export function isValidAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(value.trim());
}

/** A multisig account as summarised in list views. */
export interface MultisigSummary {
  /** Deployed account address. */
  address: string;
  /** Signatures required to authorize a transaction. */
  threshold: number;
  /** Number of owners in the account's owner set. */
  ownerCount: number;
}

/** Shortens an address for display, e.g. `0x1234…cdef`. */
export function truncateAddress(address: string, visible = 6): string {
  if (address.length <= visible * 2 + 2) return address;
  return `${address.slice(0, visible + 2)}…${address.slice(-visible)}`;
}

/** A multisig being configured before deployment. */
export interface MultisigDraft {
  /** Owner STARK public keys, as entered. */
  owners: string[];
  /** Signatures required to authorize a transaction. */
  threshold: number;
}

/** Per-field problems with a draft. Absent keys mean that field is fine. */
export interface MultisigDraftErrors {
  /** Indexed in step with `draft.owners`; `undefined` means that owner is valid. */
  owners: (string | undefined)[];
  threshold?: string;
}

/** A felt252 fits in 252 bits, so at most 63 hex digits. */
const OWNER_KEY_PATTERN = /^0x[0-9a-fA-F]{1,63}$/;

/** Whether `key` is shaped like a STARK public key the contract would accept. */
export function isValidOwnerKey(key: string): boolean {
  return OWNER_KEY_PATTERN.test(key.trim()) && BigInt(key.trim()) !== 0n;
}

/**
 * Validates a draft against the rules the contract enforces in `_set_owners`:
 * at least one owner, no zero or duplicate keys, and `0 < threshold <= owners`.
 *
 * Mirroring them here turns a would-be revert into inline feedback, before the
 * user pays for a deployment.
 */
export function validateMultisigDraft(
  draft: MultisigDraft,
): MultisigDraftErrors {
  const normalized = draft.owners.map((key) => key.trim().toLowerCase());

  const owners = draft.owners.map((key, index) => {
    const trimmed = key.trim();
    if (trimmed.length === 0) return "Enter a public key.";
    if (!isValidOwnerKey(trimmed)) return "Must be a non-zero hex felt.";
    if (normalized.indexOf(normalized[index] as string) !== index) {
      return "Duplicate owner.";
    }
    return undefined;
  });

  let threshold: string | undefined;
  if (!Number.isInteger(draft.threshold) || draft.threshold < 1) {
    threshold = "Threshold must be at least 1.";
  } else if (draft.threshold > draft.owners.length) {
    threshold = "Threshold cannot exceed the number of owners.";
  }

  return { owners, threshold };
}

/** Whether a draft is free of validation errors. */
export function isDraftValid(errors: MultisigDraftErrors): boolean {
  return !errors.threshold && errors.owners.every((e) => e === undefined);
}

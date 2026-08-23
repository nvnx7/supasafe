export interface MultisigDetail {
  address: string;
  // Owner STARK public keys, in the order the contract stores them.
  owners: string[];
  threshold: number;
}

export interface MultisigSummary {
  address: string;
  threshold: number;
  ownerCount: number;
}

export interface MultisigDraft {
  owners: string[];
  threshold: number;
}

// Entries are undefined when that field is valid; owners is indexed in step
// with draft.owners.
export interface MultisigDraftErrors {
  owners: (string | undefined)[];
  threshold?: string;
}

export type TransactionKind = "deposit" | "withdraw" | "transfer";

// A felt252 is 252 bits, so at most 63 hex digits.
const OWNER_KEY_PATTERN = /^0x[0-9a-fA-F]{1,63}$/;

export function isValidOwnerKey(key: string): boolean {
  return OWNER_KEY_PATTERN.test(key.trim()) && BigInt(key.trim()) !== 0n;
}

export function isValidAmount(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d*\.?\d+$/.test(trimmed)) return false;
  return Number(trimmed) > 0;
}

export function isValidAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(value.trim());
}

// e.g. 0x1234…cdef
export function truncateAddress(address: string, visible = 6): string {
  if (address.length <= visible * 2 + 2) return address;
  return `${address.slice(0, visible + 2)}…${address.slice(-visible)}`;
}

// Mirrors the rules _set_owners enforces on-chain, so a mistake surfaces as
// inline feedback instead of a revert the user paid for.
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

export function isDraftValid(errors: MultisigDraftErrors): boolean {
  return !errors.threshold && errors.owners.every((e) => e === undefined);
}

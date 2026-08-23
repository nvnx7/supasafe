/// An owner's account address paired with the key that account signs with, mirroring the
/// Cairo `Owner` struct. The key is what the contract verifies against; the address is what
/// forms the SNIP-12 message a wallet signs.
export interface Owner {
  address: string;
  publicKey: string;
}

export interface MultisigDetail {
  address: string;
  // In the order the contract stores them; index is what a signature bundle refers to.
  owners: Owner[];
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

// A felt252 needs 63 hex digits, but addresses are conventionally zero-padded
// to 64, so the range has to be checked by value rather than by digit count.
const HEX_PATTERN = /^0x[0-9a-fA-F]{1,64}$/;
const FELT_PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n;

export function isValidOwnerKey(key: string): boolean {
  const trimmed = key.trim();
  if (!HEX_PATTERN.test(trimmed)) return false;
  const value = BigInt(trimmed);
  return value !== 0n && value < FELT_PRIME;
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
  // Compared by value, so a padded address and its bare form count as one owner.
  const normalized = draft.owners.map((key) => {
    const trimmed = key.trim();
    return isValidOwnerKey(trimmed)
      ? BigInt(trimmed).toString()
      : trimmed.toLowerCase();
  });

  const owners = draft.owners.map((key, index) => {
    const trimmed = key.trim();
    if (trimmed.length === 0) return "Enter an account address.";
    if (!isValidOwnerKey(trimmed)) return "Must be a non-zero hex address.";
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

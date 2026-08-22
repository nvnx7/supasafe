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

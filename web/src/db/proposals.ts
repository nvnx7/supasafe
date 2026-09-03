import type {
  MultisigProposal,
  MultisigProposalSignature,
} from "@/lib/multisig-proposal-provider";
import { getDatabase } from "./neon";

type ProposalRow = {
  proposal_hash: string;
  multisig_address: string;
  owners: string[] | string;
  threshold: number;
  calls: MultisigProposal["calls"] | string;
  additional_data: string[] | string;
  proving_block_id: string | number | null;
  proof_invocation: MultisigProposal["proofInvocation"] | string | null;
  display: MultisigProposal["display"] | string;
  status: MultisigProposal["status"];
  created_at: string;
  updated_at: string;
};

type SignatureRow = {
  owner_address: string;
  signature: string[] | string;
  signed_at: string;
};

export async function listProposals({
  chainId,
  multisigAddress,
  owner,
}: {
  chainId: string;
  multisigAddress: string;
  owner: string;
}) {
  const sql = getDatabase();
  const normalizedMultisigAddress = normalizeAddress(multisigAddress);
  const normalizedOwner = normalizeAddress(owner);
  const rows = (await sql`
    SELECT
      proposal_hash,
      multisig_address,
      owners,
      threshold,
      calls,
      additional_data,
      proving_block_id,
      proof_invocation,
      display,
      status,
      created_at,
      updated_at
    FROM proposals
    INNER JOIN proposal_owners USING (chain_id, proposal_hash)
    WHERE chain_id = ${chainId}
      AND multisig_address = ${normalizedMultisigAddress}
      AND owner_address = ${normalizedOwner}
      AND status <> 'executed'
    ORDER BY updated_at DESC
  `) as ProposalRow[];

  return Promise.all(rows.map((row) => hydrateProposal(chainId, row)));
}

export async function getProposal({
  chainId,
  proposalHash,
}: {
  chainId: string;
  proposalHash: string;
}) {
  const sql = getDatabase();
  const [row] = (await sql`
    SELECT
      proposal_hash,
      multisig_address,
      owners,
      threshold,
      calls,
      additional_data,
      proving_block_id,
      proof_invocation,
      display,
      status,
      created_at,
      updated_at
    FROM proposals
    WHERE chain_id = ${chainId} AND proposal_hash = ${proposalHash}
  `) as ProposalRow[];

  return row ? hydrateProposal(chainId, row) : null;
}

export async function saveProposal({
  chainId,
  proposal,
}: {
  chainId: string;
  proposal: MultisigProposal;
}) {
  const sql = getDatabase();
  const normalizedProposal = normalizeProposal(proposal);
  const { signatures, ...record } = normalizedProposal;

  await sql`
    INSERT INTO proposals (
      chain_id,
      proposal_hash,
      multisig_address,
      owners,
      threshold,
      calls,
      additional_data,
      proving_block_id,
      proof_invocation,
      display,
      status
    ) VALUES (
      ${chainId},
      ${record.hash},
      ${record.multisigAddress},
      ${JSON.stringify(record.owners)}::jsonb,
      ${record.threshold},
      ${JSON.stringify(record.calls)}::jsonb,
      ${JSON.stringify(record.additionalData)}::jsonb,
      ${record.provingBlockId ?? null},
      ${record.proofInvocation ? JSON.stringify(record.proofInvocation) : null}::jsonb,
      ${JSON.stringify(record.display)}::jsonb,
      ${record.status}
    )
    ON CONFLICT (chain_id, proposal_hash) DO UPDATE SET
      owners = EXCLUDED.owners,
      threshold = EXCLUDED.threshold,
      calls = EXCLUDED.calls,
      additional_data = EXCLUDED.additional_data,
      proving_block_id = EXCLUDED.proving_block_id,
      proof_invocation = EXCLUDED.proof_invocation,
      display = EXCLUDED.display,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;

  await sql`
    DELETE FROM proposal_owners
    WHERE chain_id = ${chainId} AND proposal_hash = ${record.hash}
  `;
  await Promise.all(
    record.owners.map(
      (owner, ownerIndex) => sql`
      INSERT INTO proposal_owners (
        chain_id,
        proposal_hash,
        owner_address,
        owner_index
      ) VALUES (${chainId}, ${record.hash}, ${owner}, ${ownerIndex})
    `,
    ),
  );
  await Promise.all(
    signatures.map((signature) =>
      saveProposalSignature({ chainId, proposalHash: record.hash, signature }),
    ),
  );

  return getProposal({ chainId, proposalHash: record.hash });
}

export async function saveProposalSignature({
  chainId,
  proposalHash,
  signature,
}: {
  chainId: string;
  proposalHash: string;
  signature: MultisigProposalSignature;
}) {
  const sql = getDatabase();
  const normalizedSignature = {
    ...signature,
    owner: normalizeAddress(signature.owner),
  };
  const [owner] = await sql`
    SELECT owner_address
    FROM proposal_owners
    WHERE chain_id = ${chainId}
      AND proposal_hash = ${proposalHash}
      AND owner_address = ${normalizedSignature.owner}
  `;
  if (!owner) {
    throw new Error("Signature owner is not part of this proposal.");
  }

  await sql`
    INSERT INTO proposal_signatures (
      chain_id,
      proposal_hash,
      owner_address,
      signature,
      signed_at
    ) VALUES (
      ${chainId},
      ${proposalHash},
      ${normalizedSignature.owner},
      ${JSON.stringify(normalizedSignature.signature)}::jsonb,
      TO_TIMESTAMP(${normalizedSignature.signedAt} / 1000.0)
    )
    ON CONFLICT (chain_id, proposal_hash, owner_address) DO UPDATE SET
      signature = EXCLUDED.signature,
      signed_at = EXCLUDED.signed_at
  `;

  const [signatureCount] = (await sql`
    SELECT COUNT(*)::int AS signature_count
    FROM proposal_signatures
    WHERE chain_id = ${chainId} AND proposal_hash = ${proposalHash}
  `) as { signature_count: number }[];
  if (!signatureCount) {
    throw new Error("Could not count proposal approvals.");
  }
  await sql`
    UPDATE proposals
    SET
      status = CASE
        WHEN signatures.signature_count >= threshold THEN 'ready'
        ELSE 'pending'
      END,
      updated_at = NOW()
    FROM (SELECT ${signatureCount.signature_count}::int AS signature_count) AS signatures
    WHERE chain_id = ${chainId}
      AND proposal_hash = ${proposalHash}
      AND status <> 'executed'
  `;

  return getProposal({ chainId, proposalHash });
}

export async function markProposalExecuted({
  chainId,
  proposalHash,
}: {
  chainId: string;
  proposalHash: string;
}) {
  const sql = getDatabase();
  const [proposal] = (await sql`
    SELECT threshold
    FROM proposals
    WHERE chain_id = ${chainId} AND proposal_hash = ${proposalHash}
  `) as { threshold: number }[];
  if (!proposal) {
    throw new Error("Proposal was not found.");
  }
  const [signatureCount] = (await sql`
    SELECT COUNT(*)::int AS signature_count
    FROM proposal_signatures
    WHERE chain_id = ${chainId} AND proposal_hash = ${proposalHash}
  `) as { signature_count: number }[];
  if (!signatureCount || signatureCount.signature_count < proposal.threshold) {
    throw new Error("Proposal does not have enough approvals.");
  }

  await sql`
    UPDATE proposals
    SET status = 'executed', updated_at = NOW()
    WHERE chain_id = ${chainId} AND proposal_hash = ${proposalHash}
  `;
  return getProposal({ chainId, proposalHash });
}

async function hydrateProposal(chainId: string, row: ProposalRow) {
  const sql = getDatabase();
  const signatures = (await sql`
    SELECT owner_address, signature, signed_at
    FROM proposal_signatures
    WHERE chain_id = ${chainId} AND proposal_hash = ${row.proposal_hash}
    ORDER BY signed_at ASC
  `) as SignatureRow[];

  return {
    hash: row.proposal_hash,
    multisigAddress: row.multisig_address,
    owners: parseJson<string[]>(row.owners),
    threshold: row.threshold,
    calls: parseJson<MultisigProposal["calls"]>(row.calls),
    additionalData: parseJson<string[]>(row.additional_data),
    ...(row.proving_block_id === null
      ? {}
      : { provingBlockId: Number(row.proving_block_id) }),
    ...(row.proof_invocation === null
      ? {}
      : {
          proofInvocation: parseJson<MultisigProposal["proofInvocation"]>(
            row.proof_invocation,
          ),
        }),
    display: parseJson<MultisigProposal["display"]>(row.display),
    signatures: signatures.map((signature) => ({
      owner: signature.owner_address,
      signature: parseJson<string[]>(signature.signature),
      signedAt: new Date(signature.signed_at).getTime(),
    })),
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  } satisfies MultisigProposal;
}

function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function normalizeProposal(proposal: MultisigProposal): MultisigProposal {
  return {
    ...proposal,
    multisigAddress: normalizeAddress(proposal.multisigAddress),
    owners: proposal.owners.map(normalizeAddress),
    calls: proposal.calls.map((call) => ({
      ...call,
      contractAddress: normalizeAddress(call.contractAddress),
    })),
    display: {
      ...proposal.display,
      ...(proposal.display.token
        ? {
            token: {
              ...proposal.display.token,
              address: normalizeAddress(proposal.display.token.address),
            },
          }
        : {}),
      ...(proposal.display.outputToken
        ? {
            outputToken: {
              ...proposal.display.outputToken,
              address: normalizeAddress(proposal.display.outputToken.address),
            },
          }
        : {}),
      ...(proposal.display.recipient
        ? { recipient: normalizeAddress(proposal.display.recipient) }
        : {}),
      ...(proposal.display.avnu
        ? {
            avnu: {
              ...proposal.display.avnu,
              poolFeeToken: normalizeAddress(
                proposal.display.avnu.poolFeeToken,
              ),
            },
          }
        : {}),
    },
    signatures: proposal.signatures.map((signature) => ({
      ...signature,
      owner: normalizeAddress(signature.owner),
    })),
  };
}

function normalizeAddress(address: string) {
  return `0x${BigInt(address.trim()).toString(16)}`;
}

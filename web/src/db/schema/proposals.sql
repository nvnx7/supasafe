CREATE TABLE proposals (
  chain_id TEXT NOT NULL,
  proposal_hash TEXT NOT NULL,
  multisig_address TEXT NOT NULL,
  owners JSONB NOT NULL,
  threshold INTEGER NOT NULL CHECK (threshold > 0),
  calls JSONB NOT NULL,
  additional_data JSONB NOT NULL,
  proving_block_id BIGINT,
  proof_invocation JSONB,
  display JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'executed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chain_id, proposal_hash)
);

CREATE TABLE proposal_owners (
  chain_id TEXT NOT NULL,
  proposal_hash TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  owner_index INTEGER NOT NULL CHECK (owner_index >= 0),
  PRIMARY KEY (chain_id, proposal_hash, owner_address),
  FOREIGN KEY (chain_id, proposal_hash)
    REFERENCES proposals (chain_id, proposal_hash)
    ON DELETE CASCADE
);

CREATE INDEX proposal_owners_lookup_idx
  ON proposal_owners (chain_id, owner_address, proposal_hash);

CREATE TABLE proposal_signatures (
  chain_id TEXT NOT NULL,
  proposal_hash TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  signature JSONB NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chain_id, proposal_hash, owner_address),
  FOREIGN KEY (chain_id, proposal_hash)
    REFERENCES proposals (chain_id, proposal_hash)
    ON DELETE CASCADE
);

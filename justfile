# ── Top-level commands ────────────────────────────────────────────────────

# Build all JS/TS workspaces via Turbo
build:
    bun run build

# Lint and format every workspace
check:
    bun run check

# Run the full test suite (contracts + workspaces)
test: test-contracts
    bun run test

# ── Web ───────────────────────────────────────────────────────────────────

# Start the web app in dev mode
start-web:
    bun run --filter web dev

# Build the web app
build-web:
    bun run --filter web build

# ── Contracts ─────────────────────────────────────────────────────────────

# Build the Starknet contracts (Cairo, via Scarb)
build-contracts:
    cd contracts && scarb build

# Run the Cairo test suite (unit + privacy-pool integration)
test-contracts:
    cd contracts && scarb test

# Spin up a local starknet-devnet (blocks; run in its own shell)
devnet:
    cd contracts && bash scripts/devnet.sh

# Declare the multisig class and print its hash. Re-run after every devnet restart.
declare network="devnet":
    cd contracts && bun run scripts/declare.ts

# Declare and deploy the multisig. Defaults to devnet; pass a network to override.
deploy network="devnet":
    cd contracts && bun run deploy {{network}}

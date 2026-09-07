# Supasafe

Supasafe is a private, threshold-controlled multisig for Starknet. It combines a Cairo multisig account with the STRK20 privacy pool so owners can coordinate private transfers, withdrawals, swaps, and DeFi actions without exposing the multisig's private balances on-chain.

## What It Does

- Creates threshold multisigs with an on-chain owner policy.
- Registers a Supasafe-specific public view key for each owner.
- Encrypts each multisig viewing key separately for its owners, allowing every owner to recover and inspect the private account.
- Uses STRK20 to activate the multisig, discover private notes, and prepare private actions.
- Stores proposals and owner approvals in Postgres, scoped by Starknet chain ID.
- Supports private payments, AVNU and Ekubo swaps, Vesu lending, and Endur STRK staking flows where configured.

## Architecture

| Package | Purpose |
| --- | --- |
| `web` | Next.js application, API routes, proposal persistence, and STRK20 integrations. |
| `contracts` | Cairo multisig account and Supasafe Factory contracts, scripts, and tests. |
| `config` | Shared TypeScript and tooling configuration. |

The web app uses Starknet Start, `starknet.js`, the STRK20 privacy SDK, AVNU, and a Neon-compatible Postgres database. The contracts are built with Cairo, Scarb, and Starknet Foundry.

## Deployed Contracts

| Network | Contract | Address |
| --- | --- | --- |
| Starknet Mainnet | Supasafe Factory (`SupasafeRegistryFactory`) | [`0x0397ea9acd2bbf727610c3fc6b46c933bee8859e4b02f2ea4fc4e77ce51796de`](https://starkscan.co/contract/0x397ea9acd2bbf727610c3fc6b46c933bee8859e4b02f2ea4fc4e77ce51796de) |

The factory registers owner view keys, deploys multisigs, retains encrypted viewing-key envelopes, and emits owner-indexed multisig events for efficient discovery.

## Prerequisites

- Bun `1.3.6`
- Scarb `2.18.0`
- Starknet Foundry
- `just`
- A Starknet RPC endpoint for each network you intend to use
- A running STRK20 discovery service for private-balance discovery

## Setup

Install workspace dependencies:

```sh
bun install
```

Create local environment files:

```sh
cp web/.env.example web/.env
cp contracts/.env.example contracts/.env
```

Configure `web/.env` for the selected network. The main runtime settings are:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_STARKNET_NETWORK` | `devnet`, `sepolia`, or `mainnet`. |
| `NEXT_PUBLIC_RPC_URL_*` | Public Starknet RPC URL for the active network. |
| `NEXT_PUBLIC_INDEXER_URL_*` | STRK20 discovery-service URL. |
| `NEXT_PUBLIC_PROVER_URL_SEPOLIA` | Sepolia proving-service URL. |
| `API_KEY_STARKSCAN_MAINNET` | Server-side Starkscan prover key for mainnet. |
| `RELAYER_ADDRESS_*`, `RELAYER_PRIVATE_KEY_*` | Server-side relayer used for proof-bearing transactions. |
| `API_KEY_PAYMASTER_AVNU` | Server-side AVNU Paymaster key for private AVNU swaps. |
| `NEXT_PUBLIC_API_KEY_COINGECKO` | CoinGecko price API key. |
| `DATABASE_URL` | Neon/Postgres connection URL for proposals. |

Never expose server-only keys or private keys with a `NEXT_PUBLIC_` prefix.

## Database

Supasafe persists proposals, owners, signatures, and execution status in Postgres. Initialize the schema after setting `DATABASE_URL`:

```sh
psql "$DATABASE_URL" -f web/src/db/schema/proposals.sql
```

The schema stores `chain_id` on every proposal record, so Sepolia and mainnet proposal data remain isolated.

## STRK20 Discovery Service

Private balances are discovered through the STRK20 discovery service, not through a public explorer. The service must use an RPC endpoint for the same network as Supasafe and have a healthy `/health` endpoint before balances can load.

For local development, point `NEXT_PUBLIC_INDEXER_URL_SEPOLIA` or `NEXT_PUBLIC_INDEXER_URL_MAINNET` to the local service, for example `http://127.0.0.1:8081`.

## Development

Start the web app:

```sh
just start-web
```

It runs at `http://localhost:3000`.

For local contract development, start devnet and declare the multisig class after each restart:

```sh
just devnet
just declare devnet
```

Deploy the factory after configuring the relevant values in `contracts/.env`:

```sh
just deploy sepolia
just deploy mainnet
```

Useful checks:

```sh
just test
bun run --filter web check-types
bun run --filter web lint
```

## Notes

- Supasafe currently supports the Ready wallet.
- Owners must register a Supasafe view key before they can be added to a multisig.
- A multisig must be activated in the STRK20 privacy pool before it can hold or spend private funds.
- Private balance discovery and proof generation rely on external infrastructure; ensure the selected network's indexer, prover, and relayer are configured before use.
- The proposal API does not currently enforce an authentication layer. Do not expose an unprotected deployment as a production coordination service until access control and abuse protection are added.

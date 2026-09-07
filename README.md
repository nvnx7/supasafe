# Supasafe

Supasafe is a private, threshold-controlled multisig account for Starknet. It pairs a Cairo account contract with the STRK20 privacy pool so a group of owners can jointly control private balances, coordinate proposals, and use selected Starknet applications without exposing the account's private balance or transaction amounts on-chain.

> [!WARNING]
> Supasafe is work in progress and has not been independently audited. Do not use it to custody material value. Proposal routes currently have no authentication or rate limiting and must not be exposed as a public production coordination service.

## Contents

- [Supasafe](#supasafe)
  - [Contents](#contents)
  - [How It Works](#how-it-works)
    - [1. Owner View-Key Registration](#1-owner-view-key-registration)
    - [2. Multisig Creation](#2-multisig-creation)
    - [3. STRK20 Activation](#3-strk20-activation)
    - [4. Private State Recovery](#4-private-state-recovery)
    - [5. Proposal Approval and Execution](#5-proposal-approval-and-execution)
  - [Architecture](#architecture)
    - [On-Chain Components](#on-chain-components)
    - [Off-Chain Components](#off-chain-components)
  - [Deployed Contracts](#deployed-contracts)
  - [Supported Flows](#supported-flows)
    - [Payments](#payments)
    - [Applications](#applications)
  - [Requirements](#requirements)
  - [Configuration](#configuration)
    - [Web Application](#web-application)
    - [Contract Scripts](#contract-scripts)
  - [Database](#database)
  - [STRK20 Discovery Service](#strk20-discovery-service)
  - [Local Development](#local-development)
  - [Contract Deployment](#contract-deployment)
  - [Security and Operations](#security-and-operations)

## How It Works

Supasafe separates on-chain threshold authorization from STRK20 private-state recovery.

### 1. Owner View-Key Registration

Each owner connects a Ready wallet and signs a Supasafe-specific message. The app derives and stores a local Supasafe view key from that signature, then registers its public half with the Supasafe Factory. The factory emits a `ViewKeyRegistered` event keyed by the owner address.

An owner must register this key before they can be added to a multisig. The key is distinct from the STRK20 pool viewing key and is used to encrypt a recoverable copy of the multisig's viewing key for that owner.

### 2. Multisig Creation

The creator selects owners and a threshold. During creation:

1. The app verifies that every owner has a registered Supasafe public view key.
2. A new STRK20 viewing key is generated for the multisig.
3. That same multisig viewing key is encrypted separately to every owner's Supasafe public view key.
4. The Factory deploys a `PrivateMultisigAccount` with the owner addresses, owner public keys, threshold, multisig viewing public key, and encrypted view-key envelopes.

The Factory records metadata and emits a `MultisigOwnerUpdated` event for each owner. This lets the client find a user's multisigs without scanning arbitrary contract events.

### 3. STRK20 Activation

Before a multisig can receive or spend private funds, it must be registered with the STRK20 privacy pool. Activation is a multisig-controlled private action: owners create and approve a proposal, then the proof-bearing `apply_actions` transaction is submitted through the configured relay.

### 4. Private State Recovery

When an owner opens a multisig, Supasafe recovers their encrypted copy of the multisig viewing key with the owner's locally derived Supasafe view key. The recovered key is used with the STRK20 discovery service to decrypt the account's incoming notes and calculate private balances.

Every owner who can decrypt their envelope receives the complete multisig viewing key. This is intentional recovery redundancy, not threshold secret sharing.

### 5. Proposal Approval and Execution

Supasafe creates a deterministic call set and derives its proposal hash with the same hashing rules used by the account contract. Each owner approves that call set through wallet signature. Once the threshold is reached, the multisig validates the collected owner signatures and the resulting STRK20 transaction can be proved and submitted.

The database coordinates proposal discovery and signatures. The account contract remains the final authority for threshold validation.

## Architecture

| Package | Purpose |
| --- | --- |
| `web` | Next.js app, API routes, proposal persistence, UI, relaying, and dapp integrations. |
| `contracts` | Cairo account and Factory contracts, deployment scripts, and Scarb tests. |
| `config` | Shared TypeScript and tooling configuration. |

### On-Chain Components

| Component | Responsibility |
| --- | --- |
| `SupasafeRegistryFactory` | Registers owner view keys, deploys multisigs, stores encrypted key envelopes and metadata, and emits owner-indexed events. |
| `PrivateMultisigAccount` | Stores the owner policy, verifies threshold signatures, supports Starknet account execution, and implements STRK20 custom signature validation. |
| STRK20 Privacy Pool | Registers viewing keys, holds private notes, verifies proofs, and executes private actions. |

### Off-Chain Components

| Component | Responsibility |
| --- | --- |
| Next.js application | Owner-facing multisig UI and client-side private-state recovery. |
| Neon/Postgres | Proposal records, owner indexes, approval signatures, and execution status. |
| STRK20 discovery service | Reads pool state through Starknet RPC and returns paginated private note discovery results. |
| Starkscan prover | Mainnet proof generation, accessed through Supasafe's server route. |
| Relayer | Pays network and pool fees while submitting proof-bearing privacy-pool calls. |

## Deployed Contracts

| Network | Contract | Address |
| --- | --- | --- |
| Starknet Mainnet | Supasafe Factory (`SupasafeRegistryFactory`) | [`0x0397ea9acd2bbf727610c3fc6b46c933bee8859e4b02f2ea4fc4e77ce51796de`](https://starkscan.co/contract/0x397ea9acd2bbf727610c3fc6b46c933bee8859e4b02f2ea4fc4e77ce51796de) |

The Factory is the only Supasafe deployment listed here. Multisig addresses are created by the Factory and are discovered through its owner-indexed events.

## Supported Flows

### Payments

| Flow | Behavior |
| --- | --- |
| Deposit | Transfers an owner's existing **private** STRK20 balance into the multisig. The owner must first shield funds in their Ready wallet. This is not a public ERC-20 deposit. |
| Transfer | Creates a multisig proposal to privately transfer tokens to another registered STRK20 recipient. |
| Withdraw | Creates a multisig proposal to withdraw private tokens to a transparent Starknet recipient. |

### Applications

| Application | Flow | Requirement |
| --- | --- | --- |
| AVNU | Private swap proposal | AVNU API, private executor support, and a valid server-side AVNU Paymaster key. |
| Ekubo | Private swap proposal | Configured Ekubo executor, core, router, and pool data. |
| Vesu | Private supply and withdrawal proposals | Configured Vesu anonymizer and vault addresses. |
| Endur | Private STRK staking and xSTRK unstaking flows | Configured Endur anonymizer. |

Feature availability is network-specific. Empty dapp configuration disables the associated interface rather than attempting an unsafe transaction.

## Requirements

- Bun `1.3.6`
- Node.js `18` or newer
- Scarb `2.18.0`
- Starknet Foundry
- `just`
- Ready wallet
- A Starknet RPC endpoint for each intended network
- A STRK20 discovery service for each intended network
- Postgres or Neon for shared proposal persistence

## Configuration

Install dependencies and create local environment files:

```sh
bun install
cp web/.env.example web/.env
cp contracts/.env.example contracts/.env
```

### Web Application

Set the relevant variables in `web/.env`.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_STARKNET_NETWORK` | Client | Active network: `devnet`, `sepolia`, or `mainnet`. |
| `NEXT_PUBLIC_RPC_URL_DEVNET` | Client | Devnet RPC endpoint. |
| `NEXT_PUBLIC_RPC_URL_SEPOLIA` | Client | Sepolia RPC endpoint. |
| `NEXT_PUBLIC_RPC_URL_MAINNET` | Client | Mainnet RPC endpoint. |
| `NEXT_PUBLIC_PROVER_URL_SEPOLIA` | Client | Sepolia STRK20 proving service URL. |
| `NEXT_PUBLIC_INDEXER_URL_SEPOLIA` | Client | Sepolia STRK20 discovery-service URL. |
| `NEXT_PUBLIC_INDEXER_URL_MAINNET` | Client | Mainnet STRK20 discovery-service URL. |
| `NEXT_PUBLIC_API_KEY_COINGECKO` | Client | CoinGecko API key for token-price display. |
| `API_KEY_STARKSCAN_MAINNET` | Server | Starkscan prover key used by `/api/prover`. |
| `RELAYER_ADDRESS_SEPOLIA` | Server | Sepolia relay account address. |
| `RELAYER_PRIVATE_KEY_SEPOLIA` | Server | Sepolia relay account private key. |
| `RELAYER_ADDRESS_MAINNET` | Server | Mainnet relay account address. |
| `RELAYER_PRIVATE_KEY_MAINNET` | Server | Mainnet relay account private key. |
| `API_KEY_PAYMASTER_AVNU` | Server | AVNU Paymaster key for private swaps. |
| `DATABASE_URL` | Server | Neon or Postgres connection string. |

Only explicitly client-scoped values should use the `NEXT_PUBLIC_` prefix. Never expose relay keys, Starkscan keys, Paymaster keys, or database credentials to the client.

### Contract Scripts

Set the matching network credentials in `contracts/.env`:

| Variable group | Purpose |
| --- | --- |
| `RPC_DEVNET`, `RPC_SEPOLIA`, `RPC_MAINNET` | RPC endpoint used by declaration and deployment scripts. |
| `ADDRESS_DEVNET`, `ADDRESS_SEPOLIA`, `ADDRESS_MAINNET` | Deployer account address for each network. |
| `PRIVATE_KEY_DEVNET`, `PRIVATE_KEY_SEPOLIA`, `PRIVATE_KEY_MAINNET` | Deployer account private key for each network. |

## Database

Supasafe persists coordination data, not private keys or decrypted notes. The proposal records contain the deterministic call set, display metadata, owners, signatures, pinned proving context, and current status.

Initialize the schema after setting `DATABASE_URL`:

```sh
psql "$DATABASE_URL" -f web/src/db/schema/proposals.sql
```

The schema uses `(chain_id, proposal_hash)` as its primary identifier. This keeps proposals on Sepolia and mainnet isolated even if the same multisig address or proposal hash appears in both environments.

The current proposal API supports:

- Creating and listing proposals for an owner and multisig.
- Fetching proposal detail by hash.
- Saving one approval signature per owner.
- Marking a threshold-satisfied proposal as executed.

## STRK20 Discovery Service

Private balance discovery does not come from a block explorer. Supasafe uses the STRK20 discovery service to traverse encrypted pool state, decrypt notes with the recovered multisig viewing key, and determine spendable private balances.

The service must:

1. Run against an RPC endpoint for the same network as Supasafe.
2. Expose a public `GET /health` endpoint that returns `200` and `status: "OK"`.
3. Be configured as `NEXT_PUBLIC_INDEXER_URL_SEPOLIA` or `NEXT_PUBLIC_INDEXER_URL_MAINNET`.

The current discovery service also needs a real Starknet WebSocket RPC endpoint for new-head tracking. Its key runtime variables are:

```env
RPC_URL=https://<starknet-rpc>
WS_URL=wss://<starknet-websocket-rpc>
API_HOST=0.0.0.0:10000
```

When using the current service version with a `wss://` endpoint, install Rustls' `ring` provider during startup before creating the indexer:

```rust
rustls::crypto::ring::default_provider()
    .install_default()
    .expect("failed to install Rustls ring crypto provider");
```

For a Render free web service, configure an external HTTP monitor against `/health` at an interval below Render's 15-minute inactivity timeout.

## Local Development

Start the application:

```sh
just start-web
```

The web app is available at `http://localhost:3000`.

For local Cairo development, start devnet and redeclare classes after each devnet restart:

```sh
just devnet
just declare devnet
```

Run the relevant checks:

```sh
just test
bun run --filter web check-types
bun run --filter web lint
```

## Contract Deployment

Configure the chosen network's RPC, deployer address, and private key in `contracts/.env`, then run:

```sh
just deploy sepolia
just deploy mainnet
```

The deployment script declares the `PrivateMultisigAccount` and `SupasafeRegistryFactory` classes when needed, deploys a Factory configured with the multisig class hash, waits for confirmation, and prints the deployed address and class hash.

To only declare a class during development:

```sh
just declare devnet
just declare sepolia
just declare mainnet
```

## Security and Operations

- **Ready only:** Supasafe currently supports Ready as its wallet provider.
- **Private deposits:** An owner must hold enough shielded balance in Ready before depositing into a multisig. Public wallet ERC-20 balances are not automatically shielded by Supasafe.
- **Relayer funding:** The configured relay account needs STRK to cover the privacy-pool fee and network gas for proof-bearing submissions.
- **Prover latency:** Proof generation is asynchronous infrastructure work. Proposals pin their proving context and should be recreated if that context becomes invalid.
- **Indexer availability:** Balance discovery can be slow and fails closed when the discovery service is unavailable or unhealthy.
- **Key recovery:** Losing both an owner's locally derived Supasafe view key and all recoverable wallet-signature context can prevent that owner from decrypting their envelope. Store no viewing key or private key in the proposal database.
- **Proposal API:** Database coordination is currently unauthenticated. Before a public launch, add authentication, authorization, rate limiting, input abuse controls, and monitoring.
- **Deployments:** Confirm all configured contract addresses, dapp executors, pools, and RPC endpoints per network before submitting real transactions.
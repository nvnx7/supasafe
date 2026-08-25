# Supasafe

Supasafe is a Starknet threshold multisig account built for STRK20 private-transfer flows. Owners authorize pool operations together while the account's viewing key is distributed to owners as encrypted copies.

## Packages

| Package | Purpose |
| --- | --- |
| `web` | Next.js application for connecting a wallet, creating multisigs, and preparing STRK20 operations. |
| `contracts` | Cairo multisig account contract, deployment scripts, and Scarb/Foundry tests. |
| `config` | Shared TypeScript and tooling configuration. |

The web app uses `starknet.js`, Starknet Start, and `@starkware-libs/starknet-privacy-sdk`. The contracts use Cairo, Scarb, Starknet Foundry, and the Starknet privacy package.

## Development

Prerequisites:

- Bun 1.3.6
- Scarb 2.18.0 and Starknet Foundry
- `just` for the convenience commands below

Install dependencies:

```sh
bun install
```

Create local environment files from the examples and set the values for the network you intend to use:

```sh
cp web/.env.example web/.env
cp contracts/.env.example contracts/.env
```

For local contract development, start devnet in one terminal and declare the multisig class after each restart:

```sh
just devnet
just declare devnet
```

To declare on Sepolia instead:

```sh
just declare sepolia
```

Start the web application:

```sh
just start-web
```

It runs at http://localhost:3000. Use `just test` for the Cairo test suite, `bun run --filter web lint` for the web lint check, and `bun run --filter web check-types` for TypeScript checking.

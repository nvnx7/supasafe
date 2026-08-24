#!/usr/bin/env bash
# Spin up a local starknet-devnet with deterministic, pre-funded accounts.
#
# The seed is fixed so predeployed account addresses and keys are stable across
# restarts — deploy.ts fetches them from the devnet API rather than hardcoding.
#
# CHAIN_ID must match what the browser wallet uses for its localhost network and
# DEVNET_CHAIN_ID in web/src/config/network.ts; otherwise the wallet signs over a
# different transaction hash and validation fails with 'Account: invalid signature'.
set -euo pipefail

ACCOUNTS=${ACCOUNTS:-10}
PORT=${PORT:-5050}
HOST=${HOST:-127.0.0.1}
SEED=${SEED:-0}
CHAIN_ID=${CHAIN_ID:-DEVNET}

echo "Starting starknet-devnet on $HOST:$PORT with $ACCOUNTS accounts (seed $SEED, chain $CHAIN_ID)..."
exec starknet-devnet \
    --host "$HOST" \
    --port "$PORT" \
    --accounts "$ACCOUNTS" \
    --seed "$SEED" \
    --chain-id "$CHAIN_ID"

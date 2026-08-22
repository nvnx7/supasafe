#!/usr/bin/env bash
# Spin up a local starknet-devnet with deterministic, pre-funded accounts.
#
# The seed is fixed so predeployed account addresses and keys are stable across
# restarts — deploy.ts fetches them from the devnet API rather than hardcoding.
set -euo pipefail

ACCOUNTS=${ACCOUNTS:-10}
PORT=${PORT:-5050}
HOST=${HOST:-127.0.0.1}
SEED=${SEED:-0}

echo "Starting starknet-devnet on $HOST:$PORT with $ACCOUNTS accounts (seed $SEED)..."
exec starknet-devnet \
    --host "$HOST" \
    --port "$PORT" \
    --accounts "$ACCOUNTS" \
    --seed "$SEED"

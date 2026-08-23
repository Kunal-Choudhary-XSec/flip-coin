#!/usr/bin/env bash
# ------------------------------------------------------------------
# Deploys the CoinFlip contract to Stellar Testnet and writes the
# contract ID into .env.local
#
# Prerequisites:
#   - Rust + wasm32v1-none target:  rustup target add wasm32v1-none
#   - Stellar CLI:                  cargo install --locked stellar-cli
#
# Usage:
#   bash scripts/deploy.sh [identity-name]
# ------------------------------------------------------------------
set -euo pipefail

IDENTITY="${1:-coinflip-deployer}"
NETWORK="testnet"
# Native XLM Stellar Asset Contract on Testnet
NATIVE_TOKEN="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contract"
CLIENT_DIR="$ROOT_DIR/client"
ENV_FILE="$CLIENT_DIR/.env.local"

echo "==> 1/5 Ensuring deployer identity '$IDENTITY' exists (funded via Friendbot)..."
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
else
  echo "    Identity already exists: $(stellar keys address "$IDENTITY")"
  stellar keys fund "$IDENTITY" --network "$NETWORK" || true
fi

echo "==> 2/5 Building contract..."
cd "$CONTRACT_DIR"
stellar contract build

WASM=$(ls target/wasm32v1-none/release/coinflip.wasm 2>/dev/null \
    || ls target/wasm32-unknown-unknown/release/coinflip.wasm 2>/dev/null)
echo "    WASM: $WASM"

echo "==> 3/5 Running contract tests..."
cargo test --quiet

echo "==> 4/5 Deploying to $NETWORK (constructor arg: native XLM SAC)..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- \
  --token "$NATIVE_TOKEN")

echo "    Contract ID: $CONTRACT_ID"

echo "==> 5/5 Writing contract ID to client/.env.local..."
cd "$CLIENT_DIR"
if [ -f "$ENV_FILE" ]; then
  # Update in place if the key exists, otherwise append
  if grep -q '^NEXT_PUBLIC_COINFLIP_CONTRACT_ID=' "$ENV_FILE"; then
    sed -i.bak "s|^NEXT_PUBLIC_COINFLIP_CONTRACT_ID=.*|NEXT_PUBLIC_COINFLIP_CONTRACT_ID=$CONTRACT_ID|" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
  else
    echo "NEXT_PUBLIC_COINFLIP_CONTRACT_ID=$CONTRACT_ID" >> "$ENV_FILE"
  fi
else
  cp .env.example "$ENV_FILE"
  sed -i.bak "s|^NEXT_PUBLIC_COINFLIP_CONTRACT_ID=.*|NEXT_PUBLIC_COINFLIP_CONTRACT_ID=$CONTRACT_ID|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
fi

echo ""
echo "✅ Deployed successfully!"
echo "   Contract ID : $CONTRACT_ID"
echo "   Explorer    : https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo "   Config      : $ENV_FILE"

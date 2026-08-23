# ------------------------------------------------------------------
# Deploys the CoinFlip contract to Stellar Testnet (Windows PowerShell)
# and writes the contract ID into .env.local
#
# Prerequisites:
#   - Rust + wasm32v1-none target:  rustup target add wasm32v1-none
#   - Stellar CLI:                  cargo install --locked stellar-cli
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 [-Identity coinflip-deployer]
# ------------------------------------------------------------------
param(
    [string]$Identity = "coinflip-deployer"
)

$ErrorActionPreference = "Stop"

$Network = "testnet"
$NativeToken = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
$RootDir = Split-Path -Parent $PSScriptRoot
$ContractDir = Join-Path $RootDir "contract"
$ClientDir = Join-Path $RootDir "client"
$EnvFile = Join-Path $ClientDir ".env.local"

Write-Host "==> 1/5 Ensuring deployer identity '$Identity' exists..."
$null = stellar keys address $Identity 2>$null
if ($LASTEXITCODE -ne 0) {
    stellar keys generate $Identity --network $Network --fund
} else {
    Write-Host "    Identity already exists: $(stellar keys address $Identity)"
    stellar keys fund $Identity --network $Network
}

Write-Host "==> 2/5 Building contract..."
Push-Location $ContractDir
stellar contract build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Contract build failed" }

$Wasm = "target\wasm32v1-none\release\coinflip.wasm"
if (-not (Test-Path $Wasm)) { $Wasm = "target\wasm32-unknown-unknown\release\coinflip.wasm" }
Write-Host "    WASM: $Wasm"

Write-Host "==> 3/5 Running contract tests..."
cargo test --quiet
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Contract tests failed" }

Write-Host "==> 4/5 Deploying to $Network..."
$ContractId = (stellar contract deploy `
    --wasm $Wasm `
    --source $Identity `
    --network $Network `
    -- `
    --token $NativeToken).Trim()
Pop-Location
if (-not $ContractId) { throw "Deployment failed" }

Write-Host "    Contract ID: $ContractId"

Write-Host "==> 5/5 Writing contract ID to client/.env.local..."
if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $ClientDir ".env.example") $EnvFile
}
$content = Get-Content $EnvFile -Raw
if ($content -match "(?m)^NEXT_PUBLIC_COINFLIP_CONTRACT_ID=") {
    $content = $content -replace "(?m)^NEXT_PUBLIC_COINFLIP_CONTRACT_ID=.*$", "NEXT_PUBLIC_COINFLIP_CONTRACT_ID=$ContractId"
} else {
    $content += "`nNEXT_PUBLIC_COINFLIP_CONTRACT_ID=$ContractId"
}
Set-Content -Path $EnvFile -Value $content -NoNewline

Write-Host ""
Write-Host "✅ Deployed successfully!"
Write-Host "   Contract ID : $ContractId"
Write-Host "   Explorer    : https://stellar.expert/explorer/testnet/contract/$ContractId"
Write-Host "   Config      : $EnvFile"

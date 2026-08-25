# Runs the hourly gold-price snapshot logger (feeds post-daily-summary.mjs).
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot "web")
node --env-file=.env.local scripts/log-gold-price.mjs

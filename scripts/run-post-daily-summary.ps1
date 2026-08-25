# Runs once daily near market close: posts the open/high/low/close summary
# to the Facebook Page (pulled live from the Gold Traders Association's own
# OHLC feed — nothing local to commit).
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot "web")
node --env-file=.env.local scripts/post-daily-summary.mjs

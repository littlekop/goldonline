# Runs once daily near market close: posts the open/high/low/close summary
# to the Facebook Page, then commits the day's price-log file.
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot "web")
node --env-file=.env.local scripts/post-daily-summary.mjs

Set-Location $repoRoot
git add web/content/price-log
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "Log gold price snapshots for today"
  git push
}

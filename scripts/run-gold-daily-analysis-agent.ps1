# Runs the gold-daily-analysis-writer agent once every morning, locally
# (same reasoning as run-gold-news-agent.ps1 — needs real internet access
# the cloud sandbox blocks).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$publishedDir = Join-Path $repoRoot "web\content\published"
$before = @(Get-ChildItem $publishedDir -Filter *.md -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)

$prompt = @'
This is the automated daily-morning run of the gold-daily-analysis-writer workflow. Read and follow .claude/agents/gold-daily-analysis-writer.md exactly: it writes ONE dedicated summary/analysis article every day using yesterday's official open/high/low/close (fetched from the Gold Traders Association's own ohlc API, per the agent doc's Workflow step 1 — do not look for a local price-log file, it doesn't exist), always publishing (unlike gold-news-writer, this one doesn't skip for lack of "newsworthy" news — a quiet day is still written up).

Follow the workflow in that file step by step: fetch yesterday's OHLC, research the driver via WebSearch/WebFetch, write the article, source a cover image, run the self-check gate, publish if it passes (or hold for review if not), and log the outcome to web/content/publish-log.md.

Do NOT run git commands, and do NOT run post-to-facebook.mjs — the wrapper script running you handles committing, pushing, waiting for deploy, and posting to Facebook itself, in that order, after you finish. Posting to Facebook before the article is deployed fails (Facebook can't fetch a cover image URL that isn't live yet).

End with a short report: the O/H/L/C numbers used, what you wrote, the self-check result, and the outcome.
'@

& claude -p $prompt --dangerously-skip-permissions --allowed-tools "Bash,Read,Write,WebFetch,WebSearch,Glob,Grep"

# Deterministic commit/push — never rely on the agent remembering this step.
git add -A
git diff --cached --quiet
$hasChanges = ($LASTEXITCODE -ne 0)
if ($hasChanges) {
  git commit -m "gold-daily-analysis-writer: automated daily run"
  git push
}

# Deterministic Facebook post — only for articles newly published THIS run,
# and only once the live site actually serves them.
$after = @(Get-ChildItem $publishedDir -Filter *.md -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
$newFiles = $after | Where-Object { $before -notcontains $_ }

foreach ($f in $newFiles) {
  $slug = [System.IO.Path]::GetFileNameWithoutExtension($f)
  $url = "https://www.xn--42cf1cja4dza0cybnb6a3v.com/articles/$slug"
  $deployed = $false
  for ($i = 0; $i -lt 18; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
      if ($resp.StatusCode -eq 200) { $deployed = $true; break }
    } catch {}
    Start-Sleep -Seconds 10
  }
  if ($deployed) {
    Push-Location (Join-Path $repoRoot "web")
    node scripts/post-to-facebook.mjs $slug
    Pop-Location
  } else {
    Write-Host "Article $slug did not go live within 3 minutes of pushing; skipped Facebook post."
  }
}

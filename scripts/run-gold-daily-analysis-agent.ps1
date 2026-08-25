# Runs the gold-daily-analysis-writer agent once every morning, locally
# (same reasoning as run-gold-news-agent.ps1 — needs real internet access
# the cloud sandbox blocks).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$prompt = @'
This is the automated daily-morning run of the gold-daily-analysis-writer workflow. Read and follow .claude/agents/gold-daily-analysis-writer.md exactly: it writes ONE dedicated summary/analysis article every day using yesterday's official open/high/low/close (fetched from the Gold Traders Association's own ohlc API, per the agent doc's Workflow step 1 — do not look for a local price-log file, it doesn't exist), always publishing (unlike gold-news-writer, this one doesn't skip for lack of "newsworthy" news — a quiet day is still written up).

Follow the workflow in that file step by step: fetch yesterday's OHLC, research the driver via WebSearch/WebFetch, write the article, source a cover image, run the self-check gate, publish if it passes (or hold for review if not), run the Facebook auto-post script if published, and log the outcome to web/content/publish-log.md.

Do NOT run git commands yourself — the wrapper script running you handles committing and pushing automatically after you finish, regardless of what changed.

End with a short report: the O/H/L/C numbers used, what you wrote, the self-check result, and the outcome.
'@

& claude -p $prompt --dangerously-skip-permissions --allowed-tools "Bash,Read,Write,WebFetch,WebSearch,Glob,Grep"

# Deterministic commit/push — never rely on the agent remembering this step.
# (A run on 2026-08-25 wrote and self-check-passed an article but never
# pushed it, leaving it 404ing on the live site until caught manually.)
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "gold-daily-analysis-writer: automated daily run"
  git push
}

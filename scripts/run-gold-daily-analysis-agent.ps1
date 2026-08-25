# Runs the gold-daily-analysis-writer agent once every morning, locally
# (same reasoning as run-gold-news-agent.ps1 — needs real internet access
# the cloud sandbox blocks).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$prompt = @'
This is the automated daily-morning run of the gold-daily-analysis-writer workflow. Read and follow .claude/agents/gold-daily-analysis-writer.md exactly: it writes ONE dedicated summary/analysis article every day using yesterday's logged open/high/low/close from web/content/price-log/, always publishing (unlike gold-news-writer, this one doesn't skip for lack of "newsworthy" news — a quiet day is still written up).

Follow the workflow in that file step by step: read yesterday's price-log file, research the driver via WebSearch/WebFetch, write the article, source a cover image, run the self-check gate, publish if it passes (or hold for review if not), run the Facebook auto-post script if published, log the outcome to web/content/publish-log.md, then git add/commit/push whatever changed to the main branch.

End with a short report: the O/H/L/C numbers used, what you wrote, the self-check result, and the outcome.
'@

& claude -p $prompt --dangerously-skip-permissions --allowed-tools "Bash,Read,Write,WebFetch,WebSearch,Glob,Grep"

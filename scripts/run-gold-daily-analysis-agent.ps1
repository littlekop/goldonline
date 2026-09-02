# Runs the single daily content job at 08:00, locally (needs real internet
# access the cloud sandbox blocks). Combines two responsibilities into one
# run per the user's request to cut down to 2 scheduled jobs/day total:
#   1. gold-daily-analysis-writer — always writes the daily O/H/L/C summary.
#   2. gold-news-writer — checks the last 24h (since this replaces the old
#      4-hourly news-check schedule) and writes an ADDITIONAL article only
#      if something genuinely newsworthy turned up.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$publishedDir = Join-Path $repoRoot "web\content\published"
$before = @(Get-ChildItem $publishedDir -Filter *.md -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)

$prompt = @'
This is the automated daily 08:00 content run — the ONLY scheduled content job besides the 19:00 Facebook price-summary post, so it covers two responsibilities in sequence. Do both, in order:

PART 1 — Daily summary (always write this, no exceptions):
Read and follow .claude/agents/gold-daily-analysis-writer.md exactly: it writes ONE dedicated summary/analysis article using yesterday's official open/high/low/close (fetched from the Gold Traders Association's own ohlc API — do not look for a local price-log file, it doesn't exist), always publishing even on a quiet day. Follow its workflow step by step: fetch yesterday's OHLC, research the driver, write the article, source a cover image, run its self-check gate, publish if it passes (or hold for review), log the outcome to web/content/publish-log.md.

PART 2 — News check (only write if genuinely newsworthy):
Read and follow .claude/agents/gold-news-writer.md exactly for its editorial rules, sourcing bar, and self-check gate. Run `node web/scripts/fetch-gold-news-rss.mjs 24` (24-hour window, since this replaces the old 4-hourly schedule and this job only runs once/day). Apply gold-news-writer.md's "what counts as newsworthy" bar. If nothing clears it, log a "no newsworthy news found" entry (trigger: "scheduled (24h, local, part of daily run)") and stop — do not force a second article. If something genuinely newsworthy turned up (and it isn't just a restatement of what Part 1's daily summary already covered), write it as a SEPARATE article following gold-news-writer.md's full workflow (research, write, cover image, self-check, publish/hold, log).

Do NOT run git commands, and do NOT run post-to-facebook.mjs for either part — the wrapper script running you handles committing, pushing, waiting for deploy, and posting to Facebook itself for whatever got published, after you finish.

End with a short report covering both parts: the daily summary's O/H/L/C and outcome, and whether a news article was also written (and why/why not).
'@

& claude -p $prompt --dangerously-skip-permissions --allowed-tools "Bash,Read,Write,WebFetch,WebSearch,Glob,Grep"

# Deterministic commit/push — never rely on the agent remembering this step.
git add -A
git diff --cached --quiet
$hasChanges = ($LASTEXITCODE -ne 0)
if ($hasChanges) {
  git commit -m "gold-daily-content: automated daily 08:00 run"
  git push
}

# Facebook posting is DISABLED (Page has issues as of 2026-09-02, per user
# request). This job now only publishes to the website — no Facebook calls.

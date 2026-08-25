# Runs the gold-news-writer agent locally, non-interactively, on a schedule
# (via Windows Task Scheduler — see scripts/register-gold-news-task.ps1).
#
# Runs from THIS machine specifically because the claude.ai cloud routine's
# sandbox blocks outbound fetches to news sites (network egress policy) — see
# web/content/publish-log.md entry "2026-08-25 06:00 UTC" for the diagnosis.
# Running here instead gives the agent normal, unrestricted internet access.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$publishedDir = Join-Path $repoRoot "web\content\published"
$before = @(Get-ChildItem $publishedDir -Filter *.md -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)

$prompt = @'
This is an automated hourly local run of the gold-news-writer workflow (not the cloud routine — this one runs on the owner's machine specifically because it needs real internet access that the cloud sandbox blocks). Read and follow .claude/agents/gold-news-writer.md exactly: research, editorial rules, self-check gate, and logging are all defined there.

For this run specifically:
1. Run: node web/scripts/fetch-gold-news-rss.mjs 1  (checking the last 1 hour, matching this task's interval)
2. If nothing newsworthy turns up in that window, stop after research and log a "no newsworthy news found" entry to web/content/publish-log.md (trigger: "scheduled (1h, local)") — mandatory even when no article is written. Do not force an article when there is no real news; thin/repetitive content actively hurts SEO.
3. If there is something worth writing about: WebFetch and actually read the full source articles (this should work fine here, unlike the cloud routine), synthesize, write the Thai article per the ground rules, and get a cover image via node web/scripts/fetch-pexels-image.mjs "<query>" <slug> (PEXELS_API_KEY is available in web/.env.local on this machine).
4. Run the 8-point self-check gate. If it passes, publish it yourself (node web/scripts/publish-draft.mjs <slug>). If any check fails, leave it in web/content/drafts/ for human review.
5. Log the outcome to web/content/publish-log.md either way.

Do NOT run git commands, and do NOT run post-to-facebook.mjs — the wrapper script running you handles committing, pushing, waiting for deploy, and posting to Facebook itself, in that order, after you finish. Posting to Facebook before the article is deployed fails (Facebook can't fetch a cover image URL that isn't live yet) — that already happened once, which is why this is now out of your hands.

End with a short report: what you found, what you wrote (if anything), the self-check result, and the outcome.
'@

& claude -p $prompt --dangerously-skip-permissions --allowed-tools "Bash,Read,Write,WebFetch,WebSearch,Glob,Grep"

# Deterministic commit/push — never rely on the agent remembering this step.
git add -A
git diff --cached --quiet
$hasChanges = ($LASTEXITCODE -ne 0)
if ($hasChanges) {
  git commit -m "gold-news-writer: automated hourly run"
  git push
}

# Deterministic Facebook post — only for articles newly published THIS run,
# and only once the live site actually serves them (Facebook fetches the
# cover image by URL; posting earlier than deploy completion fails).
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

# One-time setup: registers the Windows Scheduled Task that posts the
# day's gold-price open/high/low/close summary to Facebook at 19:00.
# (No separate logger task needed — post-daily-summary.mjs pulls the day's
# numbers directly from the Gold Traders Association's own official hourly
# OHLC feed, not from local snapshots.)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

$summaryScript = Join-Path $repoRoot "scripts\run-post-daily-summary.ps1"
$summaryAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$summaryScript`""
$summaryTrigger = New-ScheduledTaskTrigger -Daily -At "19:00"

Register-ScheduledTask -TaskName "GoldDailySummaryPost" `
  -Action $summaryAction -Trigger $summaryTrigger -Settings $settings `
  -Description "Posts the day's gold-price open/high/low/close summary to the Facebook Page." `
  -Force

Write-Host "Registered 'GoldDailySummaryPost' (daily 19:00)."

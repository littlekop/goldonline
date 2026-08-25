# One-time setup: registers two Windows Scheduled Tasks —
#   GoldPriceLoggerHourly   — snapshots the gold price every hour
#   GoldDailySummaryPost    — posts the day's open/high/low/close to Facebook at 19:00

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

$loggerScript = Join-Path $repoRoot "scripts\run-log-gold-price.ps1"
$loggerAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$loggerScript`""
$loggerTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName "GoldPriceLoggerHourly" `
  -Action $loggerAction -Trigger $loggerTrigger -Settings $settings `
  -Description "Snapshots the gold price hourly for the daily open/high/low/close summary." `
  -Force

$summaryScript = Join-Path $repoRoot "scripts\run-post-daily-summary.ps1"
$summaryAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$summaryScript`""
$summaryTrigger = New-ScheduledTaskTrigger -Daily -At "19:00"

Register-ScheduledTask -TaskName "GoldDailySummaryPost" `
  -Action $summaryAction -Trigger $summaryTrigger -Settings $settings `
  -Description "Posts the day's gold price open/high/low/close summary to the Facebook Page." `
  -Force

Write-Host "Registered 'GoldPriceLoggerHourly' (hourly) and 'GoldDailySummaryPost' (daily 19:00)."

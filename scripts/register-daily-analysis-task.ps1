# One-time setup: registers a Windows Scheduled Task that runs
# run-gold-daily-analysis-agent.ps1 once every morning at 07:30 (local time),
# writing that day's dedicated gold-price summary & analysis article.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot "scripts\run-gold-daily-analysis-agent.ps1"

$quotedScriptPath = '"' + $scriptPath + '"'
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File $quotedScriptPath"

$trigger = New-ScheduledTaskTrigger -Daily -At "07:30"

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName "GoldDailyAnalysisWriter" `
  -Action $action -Trigger $trigger -Settings $settings `
  -Description "Writes the daily gold-price summary & analysis article every morning at 07:30, using yesterday's logged open/high/low/close." `
  -Force

Write-Host "Registered task 'GoldDailyAnalysisWriter' - runs daily at 07:30."
Write-Host 'To remove it later: Unregister-ScheduledTask -TaskName GoldDailyAnalysisWriter -Confirm:$false'

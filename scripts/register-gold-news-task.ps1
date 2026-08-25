# One-time setup: registers a Windows Scheduled Task that runs
# run-gold-news-agent.ps1 every hour, at the top of the hour, whenever this
# machine is on. Run this once (as the same user who'll be logged in when it
# fires) to install the task; re-run it any time to update the schedule.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot "scripts\run-gold-news-agent.ps1"

$quotedScriptPath = '"' + $scriptPath + '"'
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File $quotedScriptPath"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName "GoldNewsWriterHourly" `
  -Action $action -Trigger $trigger -Settings $settings `
  -Description "Runs the gold-news-writer agent hourly from this machine (cloud routine is blocked by network policy)." `
  -Force

Write-Host "Registered task 'GoldNewsWriterHourly' - runs every hour while this machine is on."
Write-Host "View/manage it in Task Scheduler, or run: Get-ScheduledTask -TaskName GoldNewsWriterHourly"
Write-Host 'To remove it later: Unregister-ScheduledTask -TaskName GoldNewsWriterHourly -Confirm:$false'

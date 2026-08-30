# One-time setup: registers a Windows Scheduled Task that runs
# run-gold-daily-analysis-agent.ps1 once every morning at 08:00 (local time).
# This is the ONLY content-writing job besides the 19:00 Facebook
# price-summary post — it always writes the daily O/H/L/C summary article,
# and also checks for genuinely newsworthy news in the last 24h (replacing
# the old separate 4-hourly news-check schedule) and writes an additional
# article only if warranted.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot "scripts\run-gold-daily-analysis-agent.ps1"

# Remove the old 07:30-named task and the separate 4-hourly news task if
# they're still registered under their old names.
Unregister-ScheduledTask -TaskName "GoldDailyAnalysisWriter" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "GoldNewsWriter4Hourly" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "GoldNewsWriterHourly" -Confirm:$false -ErrorAction SilentlyContinue

$quotedScriptPath = '"' + $scriptPath + '"'
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File $quotedScriptPath"

$trigger = New-ScheduledTaskTrigger -Daily -At "08:00"

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Minutes 45)

Register-ScheduledTask -TaskName "GoldDailyContent" `
  -Action $action -Trigger $trigger -Settings $settings `
  -Description "The one daily content job (08:00): always writes the daily O/H/L/C summary article, plus a news article if something genuinely newsworthy happened in the last 24h." `
  -Force

Write-Host "Registered task 'GoldDailyContent' - runs daily at 08:00."
Write-Host 'To remove it later: Unregister-ScheduledTask -TaskName GoldDailyContent -Confirm:$false'

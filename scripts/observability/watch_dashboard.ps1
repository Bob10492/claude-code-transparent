param(
  [string]$Date,
  [int]$PollSeconds = 3
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$observabilityDir = Join-Path $repoRoot ".observability"
$refreshScript = Join-Path $repoRoot "scripts\observability\refresh_debug_view.ps1"
$dashboardPath = Join-Path $repoRoot "ObservrityTask\10-系统版本\v1\01-总览\observability_dashboard.html"

function Resolve-TargetEventsFile {
  param(
    [string]$ObservabilityDir,
    [string]$RequestedDate
  )

  $files = Get-ChildItem -LiteralPath $ObservabilityDir -Filter "events-*.jsonl" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^events-\d{8}\.jsonl$' } |
    Sort-Object Name

  if (-not $files -or $files.Count -eq 0) {
    return $null
  }

  if (-not [string]::IsNullOrWhiteSpace($RequestedDate)) {
    $normalizedDate = $RequestedDate -replace '-', ''
    return $files | Where-Object { $_.BaseName -eq "events-$normalizedDate" } | Select-Object -First 1
  }

  return $files | Select-Object -Last 1
}

function Get-FileSignature {
  param(
    [System.IO.FileInfo]$File
  )

  if ($null -eq $File) {
    return $null
  }

  return "{0}|{1}|{2}" -f $File.FullName, $File.Length, $File.LastWriteTimeUtc.Ticks
}

function Invoke-Refresh {
  param(
    [System.IO.FileInfo]$EventsFile
  )

  Write-Output ("[{0}] 检测到日志更新，开始刷新: {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $EventsFile.FullName)
  & powershell -ExecutionPolicy Bypass -File $refreshScript -EventsFile $EventsFile.FullName
  if ($LASTEXITCODE -ne 0) {
    Write-Output ("[{0}] 刷新失败，退出码: {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $LASTEXITCODE)
    return
  }
  Write-Output ("[{0}] 已更新 dashboard: {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $dashboardPath)
}

Write-Output ("Dashboard 动态监听已启动，轮询间隔: {0}s" -f $PollSeconds)
Write-Output ("Dashboard 路径: {0}" -f $dashboardPath)

$lastSignature = $null

while ($true) {
  $targetFile = Resolve-TargetEventsFile -ObservabilityDir $observabilityDir -RequestedDate $Date
  $currentSignature = Get-FileSignature -File $targetFile

  if ($null -ne $currentSignature -and $currentSignature -ne $lastSignature) {
    $lastSignature = $currentSignature
    Invoke-Refresh -EventsFile $targetFile
  }

  Start-Sleep -Seconds $PollSeconds
}

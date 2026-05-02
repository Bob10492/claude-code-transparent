param(
  [Parameter(Mandatory = $true)]
  [string]$ScenarioId,

  [Parameter(Mandatory = $true)]
  [string]$VariantId,

  [string]$ExperimentId = "session_memory_runtime_sparse_vs_default_manual",

  [int]$MaxTurns = 8,

  [string]$DbPath = ".observability/observability_v1.duckdb"
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

function Sanitize-Id([string]$Value) {
  return (($Value -replace "[^a-zA-Z0-9_-]", "_").Trim("_"))
}

function Get-RelativeRepoPath([string]$RepoRoot, [string]$TargetPath) {
  $resolvedRepo = (Resolve-Path -LiteralPath $RepoRoot).Path
  $resolvedTarget = (Resolve-Path -LiteralPath $TargetPath).Path
  if ($resolvedTarget.StartsWith($resolvedRepo, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $resolvedTarget.Substring($resolvedRepo.Length).TrimStart('\', '/')
  }
  return $resolvedTarget
}

function Get-VariantPath([string]$RepoRoot, [string]$VariantId) {
  $direct = Join-Path $RepoRoot ("tests/evals/v2/variants/{0}.json" -f $VariantId)
  if (Test-Path -LiteralPath $direct) {
    return $direct
  }

  $template = Join-Path $RepoRoot ("tests/evals/v2/variants/{0}.template.json" -f $VariantId)
  if (Test-Path -LiteralPath $template) {
    return $template
  }

  $baseline = Join-Path $RepoRoot "tests/evals/v2/variants/baseline.template.json"
  if ($VariantId -eq "baseline_default" -and (Test-Path -LiteralPath $baseline)) {
    return $baseline
  }

  throw "Variant not found: $VariantId"
}

$repoRoot = Get-RepoRoot
$scenarioPath = Join-Path $repoRoot ("tests/evals/v2/scenarios/{0}.json" -f $ScenarioId)
if (-not (Test-Path -LiteralPath $scenarioPath)) {
  throw "Scenario not found: $ScenarioId"
}

$variantPath = Get-VariantPath -RepoRoot $repoRoot -VariantId $VariantId
$scenario = Get-Content -LiteralPath $scenarioPath -Raw | ConvertFrom-Json
$variant = Get-Content -LiteralPath $variantPath -Raw | ConvertFrom-Json

$stamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ")
$suffix = [Guid]::NewGuid().ToString("N").Substring(0, 8)
$identity = "{0}_{1}_{2}" -f (Sanitize-Id $ScenarioId), (Sanitize-Id $VariantId), $suffix
$benchmarkRunId = "manual_bench_{0}_{1}" -f $stamp, $identity
$evalRunId = "manual_eval_{0}_{1}" -f $stamp, $identity

$runRoot = Join-Path $repoRoot ".observability/v2-manual-runs"
$runDir = Join-Path $runRoot ("{0}_{1}_{2}" -f $stamp, (Sanitize-Id $ScenarioId), (Sanitize-Id $VariantId))
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$promptPath = Join-Path $runDir "prompt.txt"
$stdoutPath = Join-Path $runDir "stdout.txt"
$stderrPath = Join-Path $runDir "stderr.txt"
$commandPath = Join-Path $runDir "command.json"
$resultPath = Join-Path $runDir "result.json"

$prompt = [string]$scenario.input_prompt
Set-Content -LiteralPath $promptPath -Value $prompt -Encoding UTF8

$cliArgs = @(
  "run",
  "src/entrypoints/cli.tsx",
  "--print",
  "--output-format",
  "json",
  "--max-turns",
  [string]$MaxTurns
)

$envVars = @{
  CLAUDE_CODE_EVAL_EXPERIMENT_ID      = $ExperimentId
  CLAUDE_CODE_EVAL_SCENARIO_ID        = $ScenarioId
  CLAUDE_CODE_EVAL_VARIANT_ID         = $VariantId
  CLAUDE_CODE_EVAL_BENCHMARK_RUN_ID   = $benchmarkRunId
  CLAUDE_CODE_EVAL_RUN_ID             = $evalRunId
}

if ($variant.config_snapshot_ref) {
  $envVars.CLAUDE_CODE_EVAL_CONFIG_SNAPSHOT_REF = [string]$variant.config_snapshot_ref
}

$previousEnv = @{}
foreach ($key in $envVars.Keys) {
  $previousEnv[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
  [Environment]::SetEnvironmentVariable($key, $envVars[$key], "Process")
}

$exitCode = $null
$captureRows = @()

try {
  $commandRecord = @{
    command = "bun"
    args = $cliArgs
    scenario_id = $ScenarioId
    variant_id = $VariantId
    experiment_id = $ExperimentId
    benchmark_run_id = $benchmarkRunId
    eval_run_id = $evalRunId
    prompt_ref = Get-RelativeRepoPath -RepoRoot $repoRoot -TargetPath $promptPath
    env_keys = @($envVars.Keys | Sort-Object)
  }
  ($commandRecord | ConvertTo-Json -Depth 6) + "`n" | Set-Content -LiteralPath $commandPath -Encoding UTF8

  $rawPrompt = Get-Content -LiteralPath $promptPath -Raw
  $rawPrompt | & bun @cliArgs 1> $stdoutPath 2> $stderrPath
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    throw "Headless CLI exited with status $exitCode"
  }

  & bun run scripts/observability/build_duckdb_etl.ts | Out-Null

  $duckdbExe = Join-Path $repoRoot "tools/duckdb/duckdb.exe"
  $resolvedDbPath = if ([System.IO.Path]::IsPathRooted($DbPath)) { $DbPath } else { Join-Path $repoRoot $DbPath }
  $sql = "SELECT DISTINCT user_action_id FROM user_actions WHERE benchmark_run_id = '$($benchmarkRunId.Replace("'", "''"))' AND TRIM(COALESCE(user_action_id, '')) <> '' ORDER BY user_action_id;"
  $captureJson = & $duckdbExe -json $resolvedDbPath $sql
  if ($LASTEXITCODE -ne 0) {
    throw "DuckDB capture query failed for benchmark_run_id=$benchmarkRunId"
  }
  if ($captureJson) {
    $captureRows = $captureJson | ConvertFrom-Json
  }
} finally {
  foreach ($key in $envVars.Keys) {
    [Environment]::SetEnvironmentVariable($key, $previousEnv[$key], "Process")
  }
}

$userActionId = $null
$captureStatus = "capture_failed"
if ($captureRows.Count -eq 1) {
  $captureStatus = "captured"
  $userActionId = [string]$captureRows[0].user_action_id
} elseif ($captureRows.Count -gt 1) {
  $captureStatus = "ambiguous_capture"
}

$result = @{
  experiment_id = $ExperimentId
  scenario_id = $ScenarioId
  variant_id = $VariantId
  benchmark_run_id = $benchmarkRunId
  eval_run_id = $evalRunId
  capture_status = $captureStatus
  user_action_id = $userActionId
  match_count = $captureRows.Count
  exit_code = $exitCode
  config_snapshot_ref = if ($variant.config_snapshot_ref) { [string]$variant.config_snapshot_ref } else { $null }
  stdout_ref = Get-RelativeRepoPath -RepoRoot $repoRoot -TargetPath $stdoutPath
  stderr_ref = Get-RelativeRepoPath -RepoRoot $repoRoot -TargetPath $stderrPath
  command_ref = Get-RelativeRepoPath -RepoRoot $repoRoot -TargetPath $commandPath
  prompt_ref = Get-RelativeRepoPath -RepoRoot $repoRoot -TargetPath $promptPath
}

($result | ConvertTo-Json -Depth 6) + "`n" | Set-Content -LiteralPath $resultPath -Encoding UTF8

Write-Host ("Created manual real-run artifact: {0}" -f (Get-RelativeRepoPath -RepoRoot $repoRoot -TargetPath $resultPath))
Write-Host ("capture_status: {0}" -f $captureStatus)
if ($userActionId) {
  Write-Host ("user_action_id: {0}" -f $userActionId)
}

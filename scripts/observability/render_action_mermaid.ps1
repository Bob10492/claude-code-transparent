param(
  [string]$UserActionId,
  [switch]$Latest,
  [ValidateSet("overview", "detailed")]
  [string]$Diagram = "overview",
  [string]$OutputPath,
  [switch]$Open,
  [switch]$SnapshotDb
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$explainScript = Join-Path $PSScriptRoot "explain_action.ps1"

if (-not (Test-Path -LiteralPath $explainScript)) {
  throw "Action report script not found at $explainScript"
}

if ([string]::IsNullOrWhiteSpace($UserActionId)) {
  $Latest = $true
}

function Escape-Html {
  param([string]$Value)

  if ($null -eq $Value) {
    return ""
  }

  return $Value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
}

function Get-ReportPathFromOutput {
  param([string[]]$Lines)

  foreach ($line in $Lines) {
    if ($line -match "^Generated report:\s*(.+)$") {
      return $Matches[1].Trim()
    }
  }

  return $null
}

function Get-MermaidBlock {
  param(
    [string]$ReportText,
    [string]$DiagramKind
  )

  $heading = if ($DiagramKind -eq "detailed") { "## Mermaid Detailed DAG" } else { "## Mermaid Overview" }
  $pattern = '(?s)' + [regex]::Escape($heading) + '.*?```mermaid\s*(.*?)\s*```'
  $match = [regex]::Match($ReportText, $pattern)

  if (-not $match.Success) {
    throw "Mermaid block not found for diagram kind: $DiagramKind"
  }

  return $match.Groups[1].Value.Trim()
}

$reportOutputDir = Join-Path $repoRoot ".observability\action-reports"
[System.IO.Directory]::CreateDirectory($reportOutputDir) | Out-Null
$reportPath = Join-Path $reportOutputDir ("user_action_{0}_render_source.md" -f ($(if ($Latest) { "latest" } else { $UserActionId.Substring(0, [Math]::Min(8, $UserActionId.Length)) })))

$explainParams = @{
  OutputPath = $reportPath
}
if ($Latest) {
  $explainParams.Latest = $true
} else {
  $explainParams.UserActionId = $UserActionId
}
if ($SnapshotDb) {
  $explainParams.SnapshotDb = $true
}

$reportOutput = @(& $explainScript @explainParams)
$generatedReportPath = Get-ReportPathFromOutput -Lines $reportOutput
if (-not [string]::IsNullOrWhiteSpace($generatedReportPath)) {
  $reportPath = $generatedReportPath
}

if (-not (Test-Path -LiteralPath $reportPath)) {
  throw "Generated action report not found at $reportPath"
}

$reportText = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8
$mermaid = Get-MermaidBlock -ReportText $reportText -DiagramKind $Diagram

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $htmlOutputDir = Join-Path $repoRoot ".observability\action-flowcharts"
  [System.IO.Directory]::CreateDirectory($htmlOutputDir) | Out-Null
  $reportBaseName = [System.IO.Path]::GetFileNameWithoutExtension($reportPath)
  $OutputPath = Join-Path $htmlOutputDir ("{0}_{1}.html" -f $reportBaseName, $Diagram)
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $repoRoot $OutputPath
}

$title = "Observability Action Flowchart - $Diagram"
$escapedTitle = Escape-Html $title
$escapedMermaid = Escape-Html $mermaid
$escapedReportPath = Escape-Html $reportPath
$generatedAt = [DateTimeOffset]::Now.ToString("yyyy-MM-dd HH:mm:ss zzz")

$html = @"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$escapedTitle</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f3ea;
      --panel: #fffdf8;
      --ink: #1f2933;
      --muted: #667085;
      --line: #d9cdb8;
      --accent: #0f766e;
    }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(15, 118, 110, 0.16), transparent 30rem),
        linear-gradient(135deg, #fbf4e3 0%, #edf7f3 100%);
      color: var(--ink);
      font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    header {
      padding: 28px 36px 18px;
      border-bottom: 1px solid var(--line);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      letter-spacing: -0.02em;
    }
    .meta {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.7;
    }
    main {
      padding: 24px 36px 40px;
    }
    .canvas {
      overflow: auto;
      padding: 24px;
      background: rgba(255, 253, 248, 0.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: 0 18px 55px rgba(31, 41, 51, 0.12);
    }
    .mermaid {
      min-width: 760px;
      text-align: center;
    }
    .hint {
      margin-top: 14px;
      color: var(--muted);
      font-size: 13px;
    }
    code {
      color: var(--accent);
    }
  </style>
</head>
<body>
  <header>
    <h1>$escapedTitle</h1>
    <div class="meta">
      diagram: <code>$Diagram</code><br />
      generated_at: <code>$generatedAt</code><br />
      source_report: <code>$escapedReportPath</code>
    </div>
  </header>
  <main>
    <section class="canvas">
      <pre class="mermaid">
$escapedMermaid
      </pre>
    </section>
    <p class="hint">如果页面没有渲染成图，通常是浏览器无法加载 Mermaid CDN；此时仍可复制源报告中的 Mermaid 代码到 Mermaid Live Editor。</p>
  </main>
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({
      startOnLoad: true,
      securityLevel: "loose",
      theme: "base",
      flowchart: {
        curve: "basis",
        htmlLabels: true,
        nodeSpacing: 42,
        rankSpacing: 58
      }
    });
  </script>
</body>
</html>
"@

[System.IO.Directory]::CreateDirectory((Split-Path -Parent $OutputPath)) | Out-Null
$html | Set-Content -LiteralPath $OutputPath -Encoding UTF8

Write-Output ("Generated flowchart: {0}" -f $OutputPath)
Write-Output ("Source report: {0}" -f $reportPath)

if ($Open) {
  Start-Process -FilePath $OutputPath
}

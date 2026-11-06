# scripts/brand-gate.ps1 - Brand compliance gate (English strings, BOM required)
# Usage: .\scripts\brand-gate.ps1 [-Paths "src,web/src"]
# Exit: 0=pass (no hard violations), 1=hard violations found or path error

param(
  [string]$Paths = "src,web/src"
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$wordsFile = Join-Path $repoRoot 'logs\brand-words-reversed.txt'
if (-not (Test-Path -LiteralPath $wordsFile)) {
  Write-Host "FAIL: words file not found: $wordsFile"
  exit 1
}

# Load words (one per line), skip comments and blank
$words = @()
foreach ($line in [System.IO.File]::ReadAllLines($wordsFile, [Text.Encoding]::UTF8)) {
  $w = $line.Trim()
  if ($w -and -not $w.StartsWith('#')) { $words += $w }
}
Write-Host "words loaded: $($words.Count)"

# gangos_ prefix is a separate backlog scan (not from word list)
$BACKLOG_PREFIX = 'gangos_'

# Allowed extensions (option A: manual filter to avoid -LiteralPath + -Include bug)
$allowedExt = @('.ts', '.tsx', '.js', '.jsx', '.mts', '.md')

# Parse paths
$pathList = $Paths -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
$filesScanned = 0
$hardViolations = @()
$backlogGangos = @()

foreach ($p in $pathList) {
  # Support absolute paths; fail-closed if path not found
  $full = if ([IO.Path]::IsPathRooted($p)) { $p } else { Join-Path $repoRoot $p }
  if (-not (Test-Path -LiteralPath $full)) {
    Write-Host "ERROR: path not found: $full"
    exit 1
  }
  # Use -Path (not -LiteralPath) so -Recurse works; manual extension filter
  $files = Get-ChildItem -Path $full -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $allowedExt -contains $_.Extension.ToLower() }
  foreach ($f in $files) {
    $filesScanned++
    $rel = $f.FullName.Substring($repoRoot.Length + 1)
    # Skip logs/ directory entirely
    if ($rel -like 'logs\*') { continue }
    $content = [System.IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)

    # Scan words from list
    foreach ($w in $words) {
      $matchesFound = [regex]::Matches($content, [regex]::Escape($w), 'IgnoreCase')
      foreach ($m in $matchesFound) {
        $hardViolations += [PSCustomObject]@{ file = $rel; line = 0; word = $w }
      }
    }

    # Separate scan for gangos_ prefix (backlog, not in word list)
    $gangosCount = ([regex]::Matches($content, [regex]::Escape($BACKLOG_PREFIX))).Count
    if ($gangosCount -gt 0) {
      for ($gi = 0; $gi -lt $gangosCount; $gi++) {
        $backlogGangos += [PSCustomObject]@{ file = $rel; count = $gangosCount }
      }
    }
  }
}

Write-Host ""
Write-Host "=== brand-gate result ==="
Write-Host "filesScanned: $filesScanned"
Write-Host "hardViolations: $($hardViolations.Count)"
if ($hardViolations.Count -gt 0) {
  foreach ($v in $hardViolations) {
    Write-Host "  HARD: $($v.file) word=$($v.word)"
  }
}
Write-Host "backlogGangos: $($backlogGangos.Count)"
$gangosFiles = $backlogGangos | ForEach-Object { $_.file } | Sort-Object -Unique
Write-Host "  files: $($gangosFiles -join ', ')"

if ($hardViolations.Count -gt 0) {
  Write-Host "FAIL: hard violations found"
  exit 1
} else {
  Write-Host "PASS"
  exit 0
}

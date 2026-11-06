# scripts/brand-gate.ps1 - Brand compliance gate (single source of truth)
# Usage: .\scripts\brand-gate.ps1 [-Paths "src,web/src"]
# Exit: 0 = no hard violations, 1 = hard violations found or wordlist/path error
# Word list lives in scripts\brand-words.b64.txt (base64 per line) so the gate runs on any clone.

param(
  [string]$Paths = "src,web/src"
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$BACKLOG_PREFIX = 'gangos_'
$allowedExt = @('.ts', '.tsx', '.js', '.jsx', '.mts', '.md', '.css', '.json', '.yml', '.yaml')

$words = @()
$b64File = Join-Path $repoRoot 'scripts\brand-words.b64.txt'
$plainFile = Join-Path $repoRoot 'logs\brand-words-reversed.txt'
if (Test-Path -LiteralPath $b64File) {
  foreach ($line in [IO.File]::ReadAllLines($b64File, [Text.Encoding]::UTF8)) {
    $s = $line.Trim()
    if (-not $s -or $s.StartsWith('#')) { continue }
    try { $words += [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)) }
    catch { Write-Host "FAIL: bad base64 line in word list"; exit 1 }
  }
} elseif (Test-Path -LiteralPath $plainFile) {
  foreach ($line in [IO.File]::ReadAllLines($plainFile, [Text.Encoding]::UTF8)) {
    $s = $line.Trim()
    if ($s -and -not $s.StartsWith('#')) { $words += $s }
  }
} else {
  Write-Host "FAIL: word list not found (scripts\brand-words.b64.txt)"
  exit 1
}
if ($words.Count -eq 0) { Write-Host "FAIL: word list empty"; exit 1 }
Write-Host "words loaded: $($words.Count)"

$pathList = $Paths -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
$filesScanned = 0
$hardViolations = @()
$backlogHits = 0
$backlogFiles = @()

foreach ($p in $pathList) {
  $full = if ([IO.Path]::IsPathRooted($p)) { $p } else { Join-Path $repoRoot $p }
  if (-not (Test-Path -LiteralPath $full)) {
    Write-Host "ERROR: path not found: $full"
    exit 1
  }
  # -LiteralPath rejects -Include; use -Path plus a manual extension filter.
  $files = Get-ChildItem -Path $full -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $allowedExt -contains $_.Extension.ToLower() -and $_.FullName -notmatch '\\node_modules\\' }
  foreach ($f in $files) {
    # Skip only the repo-root logs directory; nested product pages named logs must be scanned.
    if ($rel -like 'logs\*') { continue }
    $filesScanned++
    $rel = $f.FullName
    if ($rel.StartsWith($repoRoot)) { $rel = $rel.Substring($repoRoot.Length + 1) }
    $rel = $rel -replace '/', '\'
    $content = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)

    foreach ($w in $words) {
      $idx = 0
      while (($idx = $content.IndexOf($w, $idx, [StringComparison]::OrdinalIgnoreCase)) -ge 0) {
        $pre = $content.Substring(0, $idx)
        $lineNo = ($pre.Length - $pre.Replace("`n", '').Length) + 1
        $hardViolations += [PSCustomObject]@{ file = $rel; line = $lineNo; word = $w }
        $idx += [Math]::Max(1, $w.Length)
      }
    }

    $g = ([regex]::Matches($content, [regex]::Escape($BACKLOG_PREFIX))).Count
    if ($g -gt 0) {
      $backlogHits += $g
      if (-not ($backlogFiles -contains $rel)) { $backlogFiles += $rel }
    }
  }
}

Write-Host ""
Write-Host "=== brand-gate result ==="
Write-Host "filesScanned: $filesScanned"
Write-Host "hardViolations: $($hardViolations.Count)"
foreach ($v in $hardViolations) {
  Write-Host "  HARD: $($v.file):$($v.line) word=$($v.word)"
}
Write-Host "backlogGangos: $backlogHits"
Write-Host "  files: $(($backlogFiles | Sort-Object) -join ', ')"

if ($hardViolations.Count -gt 0) {
  Write-Host "FAIL: hard violations found"
  exit 1
}
Write-Host "PASS"
exit 0

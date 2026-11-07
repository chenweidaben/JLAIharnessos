# scripts/brand-gate.ps1 - Brand compliance gate (single source of truth)
# Usage: .\scripts\brand-gate.ps1 [-Paths "src,web/src"]
# Exit: 0 = no hard violations, 1 = hard violations found or wordlist/path error
# Word list lives in scripts\brand-words.b64.txt (base64 per line) so the gate runs on any clone.
# Entry format: plain line = literal vendor string (case-insensitive, legacy behaviour).
#               line decoding to "RE:<pattern>" = .NET regex, case-sensitive (boundary-safe brand terms).
# Scope note: default scope is product code (src,web/src). Documentation (docs/, reports/) is scanned
#             separately on demand via -Paths "." and its residue is tracked as doc debt, not code debt.

param(
  [string]$Paths = "src,web/src"
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$BACKLOG_PREFIX = 'gangos_'
$allowedExt = @('.ts', '.tsx', '.js', '.jsx', '.mts', '.md', '.css', '.json', '.yml', '.yaml')

$entries = @()
$b64File = Join-Path $repoRoot 'scripts\brand-words.b64.txt'
$plainFile = Join-Path $repoRoot 'logs\brand-words-reversed.txt'
if (Test-Path -LiteralPath $b64File) {
  foreach ($line in [IO.File]::ReadAllLines($b64File, [Text.Encoding]::UTF8)) {
    $s = $line.Trim()
    if (-not $s -or $s.StartsWith('#')) { continue }
    try { $dec = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)) }
    catch { Write-Host "FAIL: bad base64 line in word list"; exit 1 }
    if ($dec.StartsWith('RE:')) {
      try { $re = [regex]$dec.Substring(3); [void]$re.IsMatch('probe') }
      catch { Write-Host "FAIL: bad regex entry in word list"; exit 1 }
      $entries += [PSCustomObject]@{ kind = 'regex'; text = $dec.Substring(3); re = $re; label = 'RE' }
    } else {
      $entries += [PSCustomObject]@{ kind = 'literal'; text = $dec; re = $null; label = 'LIT' }
    }
  }
} elseif (Test-Path -LiteralPath $plainFile) {
  foreach ($line in [IO.File]::ReadAllLines($plainFile, [Text.Encoding]::UTF8)) {
    $s = $line.Trim()
    if ($s -and -not $s.StartsWith('#')) {
      $entries += [PSCustomObject]@{ kind = 'literal'; text = $s; re = $null; label = 'LIT' }
    }
  }
} else {
  Write-Host "FAIL: word list not found (scripts\brand-words.b64.txt)"
  exit 1
}
if ($entries.Count -eq 0) { Write-Host "FAIL: word list empty"; exit 1 }
$litCount = @($entries | Where-Object { $_.kind -eq 'literal' }).Count
$reCount = @($entries | Where-Object { $_.kind -eq 'regex' }).Count
Write-Host "words loaded: $($entries.Count) (literal=$litCount regex=$reCount)"

$pathList = $Paths -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
$filesScanned = 0
$hardViolations = @()
$backlogHits = 0
$backlogFiles = @()
$scopeCode = 0
$scopeDoc = 0

function Get-LineNo([string]$content, [int]$index) {
  $pre = $content.Substring(0, $index)
  return ($pre.Length - $pre.Replace([string][char]10, '').Length) + 1
}

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
    $rel = $f.FullName
    if ($rel.StartsWith($repoRoot)) { $rel = $rel.Substring($repoRoot.Length + 1) }
    $rel = $rel -replace '/', '\'
    # Skip only the repo-root logs directory; nested product pages named logs must be scanned.
    if ($rel -like 'logs\*') { continue }
    $filesScanned++
    $content = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)

    foreach ($e in $entries) {
      if ($e.kind -eq 'literal') {
        $idx = 0
        while (($idx = $content.IndexOf($e.text, $idx, [StringComparison]::OrdinalIgnoreCase)) -ge 0) {
          $lineNo = Get-LineNo $content $idx
          $hardViolations += [PSCustomObject]@{ file = $rel; line = $lineNo; word = $e.text }
          $idx += [Math]::Max(1, $e.text.Length)
        }
      } else {
        foreach ($mm in $e.re.Matches($content)) {
          $lineNo = Get-LineNo $content $mm.Index
          $hardViolations += [PSCustomObject]@{ file = $rel; line = $lineNo; word = $e.text }
        }
      }
    }

    $g = ([regex]::Matches($content, [regex]::Escape($BACKLOG_PREFIX))).Count
    if ($g -gt 0) {
      $backlogHits += $g
      if (-not ($backlogFiles -contains $rel)) { $backlogFiles += $rel }
    }
  }
}

foreach ($v in $hardViolations) {
  if ($v.file -like 'docs\*' -or $v.file -like 'reports\*' -or $v.file -notlike '*\*') { $scopeDoc++ } else { $scopeCode++ }
}

Write-Host ""
Write-Host "=== brand-gate result ==="
Write-Host "scope: $Paths"
Write-Host "filesScanned: $filesScanned"
Write-Host "hardViolations: $($hardViolations.Count) (code=$scopeCode doc=$scopeDoc)"
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

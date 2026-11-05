# 2207 round - parse bun test stderr for segment counts, extract consult coverage rows, append summary
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261103-0307"
$testErr = Join-Path $log "patrol-bun-test-err.log"
$covErr  = Join-Path $log "patrol-coverage-err.log"
$sum     = Join-Path $log "patrol-bun-summary.log"

$lines = [System.IO.File]::ReadAllLines($testErr, [System.Text.Encoding]::UTF8)
$mode = ""
$seg = @{ unit = @{ files = 0; pass = 0 }; security = @{ files = 0; pass = 0 }; integration = @{ files = 0; pass = 0 } }
$seen = @{ unit = @{}; security = @{}; integration = @{} }
foreach ($ln in $lines) {
  if ($ln -match '^tests[\\/]unit[\\/]consult-agent[\\/]') { $mode = "unit" }
  elseif ($ln -match '^tests[\\/]security[\\/]consult-agent[\\/]') { $mode = "security" }
  elseif ($ln -match '^tests[\\/]integration[\\/]consult-agent[\\/]') { $mode = "integration" }
  if ($mode -ne "") {
    if ($ln -match '^tests[\\/].+\.test\.ts:') { if (-not $seen[$mode].ContainsKey($ln)) { $seen[$mode][$ln] = 1; $seg[$mode].files++ } }
    $seg[$mode].pass += ([regex]::Matches($ln, '\(pass\)')).Count
  }
}
$unitP = $seg["unit"].pass; $secP = $seg["security"].pass; $intP = $seg["integration"].pass
$unitF = $seg["unit"].files; $secF = $seg["security"].files; $intF = $seg["integration"].files

$totalPass = 0; $totalFail = 0; $totalExpect = 0; $totalFiles = 0; $reportDur = ""
foreach ($ln in $lines) {
  if ($ln -match '^\s*(\d+)\s+pass\s*$') { $totalPass = [int]$Matches[1] }
  if ($ln -match '^\s*(\d+)\s+fail\s*$') { $totalFail = [int]$Matches[1] }
  if ($ln -match '^\s*(\d+)\s+expect\(\) calls') { $totalExpect = [int]$Matches[1] }
  if ($ln -match '^Ran\s+(\d+)\s+tests across\s+(\d+)\s+files\.\s*\[([0-9.]+s)\]') { $totalFiles = [int]$Matches[2]; $reportDur = $Matches[3] }
}

Add-Content -LiteralPath $sum -Value ("SEGMENT unit=$unitP($unitF f) security=$secP($secF f) integration=$intP($intF f)") -Encoding UTF8
Add-Content -LiteralPath $sum -Value ("BUN_TEST_TOTAL pass=$totalPass fail=$totalFail expect=$totalExpect files=$totalFiles report_duration=$reportDur") -Encoding UTF8

$covLines = [System.IO.File]::ReadAllLines($covErr, [System.Text.Encoding]::UTF8)
$allFuncs = ""; $allLines = ""
$consRows = New-Object System.Collections.Generic.List[string]
foreach ($ln in $covLines) {
  if ($ln -match '^\s*All files\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|') { $allFuncs = $Matches[1]; $allLines = $Matches[2] }
  if ($ln -match '^\s*src[\\/]') {
    if ($ln -match 'consult') { $consRows.Add($ln.TrimEnd()) }
  }
}
Set-Content -LiteralPath (Join-Path $log "patrol-coverage-consult.txt") -Value $consRows -Encoding UTF8
Add-Content -LiteralPath $sum -Value ("COVERAGE_ALL_FILES All files                                           |   $allFuncs |   $allLines |") -Encoding UTF8
$baseF = 84.49; $baseL = 85.25; $deltaLine = "COVERAGE_BASELINE Funcs=$baseF Lines=$baseL DELTA=NA"
if ($allFuncs -ne "" -and $allLines -ne "") {
  $df = [Math]::Round([double]$allFuncs - $baseF, 2)
  $dl = [Math]::Round([double]$allLines - $baseL, 2)
  $dfSign = "+"; if ($df -lt 0) { $dfSign = "-" }; $dlSign = "+"; if ($dl -lt 0) { $dlSign = "-" }
  $deltaLine = "COVERAGE_BASELINE Funcs=$baseF Lines=$baseL DELTA Funcs=$dfSign" + [Math]::Abs($df) + " Lines=$dlSign" + [Math]::Abs($dl)
}
Add-Content -LiteralPath $sum -Value $deltaLine -Encoding UTF8
Write-Host ("unit=$unitP/$unitF security=$secP/$secF integration=$intP/$intF total=$totalPass/$totalFail expect=$totalExpect files=$totalFiles dur=$reportDur")
Write-Host ("COVERAGE Funcs=$allFuncs Lines=$allLines consultRows=$($consRows.Count)")

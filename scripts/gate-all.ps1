# scripts/gate-all.ps1 - Run all gates in sequence (tsc root, tsc web, unit, e2e)
# Usage: .\scripts\gate-all.ps1 [-UnitBaseline "181/0/512"] [-E2eBaseline "23/0/83"]

param(
  [string]$UnitBaseline = "",
  [string]$E2eBaseline = "23/0/83",
  [string]$BrandPaths = "",
  [switch]$UnitWithChain
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$results = @()

function Run-Step($name, $logSuffix, $scriptBlock) {
  $logFile = Join-Path $repoRoot "logs\gate-all-$ts-$logSuffix.log"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  & $scriptBlock $logFile
  $sw.Stop()
  $exit = $LASTEXITCODE
  $bytes = 0
  if (Test-Path -LiteralPath $logFile) {
    $bytes = (Get-Item -LiteralPath $logFile).Length
  }
  $status = if ($exit -eq 0 -and $bytes -eq 0) { 'PASS' }
            elseif ($exit -eq 0 -and $logSuffix -like 'tsc-*') { 'PASS' }
            else { 'FAIL' }
  $results += [PSCustomObject]@{ Step=$name; Status=$status; Seconds=[int]$sw.Elapsed.TotalSeconds; Log=$logFile }
  Write-Host "  [$name] $status ($([int]$sw.Elapsed.TotalSeconds)s) exit=$exit bytes=$bytes"
  return $status
}

# Step 1: root tsc
Write-Host "=== 1/5 root tsc ==="
$log1 = "logs\gate-all-$ts-tsc-root.log"
$sw1 = [System.Diagnostics.Stopwatch]::StartNew()
cmd /c "node node_modules/typescript/bin/tsc --noEmit > `"$repoRoot\$log1`" 2>&1"
$exit1 = $LASTEXITCODE
$sw1.Stop()
$bytes1 = (Get-Item -LiteralPath "$repoRoot\$log1").Length
$st1 = if ($exit1 -eq 0) { 'PASS' } else { 'FAIL' }
Write-Host "  [$st1] root tsc exit=$exit1 bytes=$bytes1 ($([int]$sw1.Elapsed.TotalSeconds)s)"
$results += [PSCustomObject]@{ Step='tsc-root'; Status=$st1; Seconds=[int]$sw1.Elapsed.TotalSeconds }

# Step 2: web tsc
Write-Host "=== 2/5 web tsc ==="
$log2 = "logs\gate-all-$ts-tsc-web.log"
$sw2 = [System.Diagnostics.Stopwatch]::StartNew()
$bunExe = (Get-Command bun -ErrorAction SilentlyContinue).Source
if (-not $bunExe) { $bunExe = "$env:USERPROFILE\.bun\bin\bun.exe" }
cmd /c "cd /d `"$repoRoot\web`" && `"$bunExe`" x tsc --noEmit > `"$repoRoot\$log2`" 2>&1"
$exit2 = $LASTEXITCODE
$sw2.Stop()
$bytes2 = (Get-Item -LiteralPath "$repoRoot\$log2").Length
$st2 = if ($exit2 -eq 0) { 'PASS' } else { 'FAIL' }
Write-Host "  [$st2] web tsc exit=$exit2 bytes=$bytes2 ($([int]$sw2.Elapsed.TotalSeconds)s)"
$results += [PSCustomObject]@{ Step='tsc-web'; Status=$st2; Seconds=[int]$sw2.Elapsed.TotalSeconds }

# Step 3: gate-unit
Write-Host "=== 3/5 gate-unit ==="
$sw3 = [System.Diagnostics.Stopwatch]::StartNew()
$unitArgs = @('-ExecutionPolicy','Bypass','-File',"$repoRoot\scripts\gate-unit.ps1")
if ($UnitWithChain) { $unitArgs += '-WithChain' }
if ($UnitBaseline) { $unitArgs += @('-Baseline',$UnitBaseline) }
& powershell @unitArgs
$exit3 = $LASTEXITCODE
$sw3.Stop()
$st3 = if ($exit3 -eq 0) { 'PASS' } else { 'FAIL' }
Write-Host "  [$st3] gate-unit exit=$exit3 ($([int]$sw3.Elapsed.TotalSeconds)s)"
$results += [PSCustomObject]@{ Step='gate-unit'; Status=$st3; Seconds=[int]$sw3.Elapsed.TotalSeconds }

# Step 4: gate-e2e
Write-Host "=== 4/5 gate-e2e ==="
$sw4 = [System.Diagnostics.Stopwatch]::StartNew()
& powershell -ExecutionPolicy Bypass -File "$repoRoot\scripts\gate-e2e.ps1" -Baseline $E2eBaseline
$exit4 = $LASTEXITCODE
$sw4.Stop()
$st4 = if ($exit4 -eq 0) { 'PASS' } else { 'FAIL' }
Write-Host "  [$st4] gate-e2e exit=$exit4 ($([int]$sw4.Elapsed.TotalSeconds)s)"
$results += [PSCustomObject]@{ Step='gate-e2e'; Status=$st4; Seconds=[int]$sw4.Elapsed.TotalSeconds }

# Step 5: brand-gate
Write-Host "=== 5/5 brand-gate ==="
$sw5 = [System.Diagnostics.Stopwatch]::StartNew()
if ($BrandPaths) {
  & powershell -ExecutionPolicy Bypass -File "$repoRoot\scripts\brand-gate.ps1" -Paths $BrandPaths
} else {
  & powershell -ExecutionPolicy Bypass -File "$repoRoot\scripts\brand-gate.ps1"
}
$exit5 = $LASTEXITCODE
$sw5.Stop()
$st5 = if ($exit5 -eq 0) { 'PASS' } else { 'FAIL' }
Write-Host "  [$st5] brand-gate exit=$exit5 ($([int]$sw5.Elapsed.TotalSeconds)s)"
$results += [PSCustomObject]@{ Step='brand-gate'; Status=$st5; Seconds=[int]$sw5.Elapsed.TotalSeconds }

# Summary
Write-Host ""
Write-Host "=== SUMMARY ==="
$results | Format-Table -AutoSize
$failCount = 0
foreach ($r in $results) { if ($r.Status -eq 'FAIL') { $failCount++ } }
if ($failCount -gt 0) {
  Write-Host "OVERALL: FAIL ($failCount steps failed)"
  exit 1
} else {
  Write-Host "OVERALL: PASS"
  exit 0
}

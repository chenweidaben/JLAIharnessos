# scripts/gate-unit.ps1 - P5 WORM+audit unit test gate (PowerShell 5.1 safe, English strings)
# Usage: .\scripts\gate-unit.ps1 [-Baseline "181/0/512"]
# Output: logs/gate-unit-<timestamp>.log
# Exit: 0=pass, 1=fail

param(
  [string]$Baseline = "",
  [switch]$WithChain
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $repoRoot "logs\gate-unit-$ts.log"

# Official 13-file list (must match scripts/gate-unit.mts)
$files = @(
  './tests/unit/wormArchive.test.ts',
  './tests/unit/wormKeysRoutes.test.ts',
  './tests/unit/wormKeyProvider.test.ts',
  './tests/unit/keyOpsStore.test.ts',
  './tests/unit/auditEventHook.test.ts',
  './tests/unit/wormAuditCombo.test.ts',
  './tests/unit/auditEventStore.test.ts',
  './tests/unit/wormExternalIntegrations.test.ts',
  './tests/unit/wormStoreResilience.test.ts',
  './tests/unit/wormLayeredStore.test.ts',
  './tests/unit/backfillTruncation.test.ts',
  './tests/unit/integration/VendorAdapters.test.ts',
  './tests/integration/worm-s3-fallback.test.ts'
)
# Optional 14th file (audit chain verify)
$chainFile = './tests/unit/auditChainVerify.test.ts'

# Default baselines per mode
if (-not $Baseline) {
  if ($WithChain) { $Baseline = '186/0/522' } else { $Baseline = '181/0/512' }
}
if ($WithChain) { $files += $chainFile }

# Check files exist
$missing = @()
foreach ($f in $files) {
  $abs = Join-Path $repoRoot ($f -replace '^\./', '')
  if (-not (Test-Path -LiteralPath $abs)) { $missing += $f }
}
if ($missing.Count -gt 0) {
  Write-Host "FAIL: missing files: $($missing -join ', ')"
  exit 1
}

# Resolve bun path: PATH then fallback
$bunExe = $null
$cmdBun = Get-Command bun -ErrorAction SilentlyContinue
if ($cmdBun) { $bunExe = $cmdBun.Source }
if (-not $bunExe) {
  $cand = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
  if (Test-Path -LiteralPath $cand) { $bunExe = $cand }
}
if (-not $bunExe) {
  Write-Host "FAIL: bun not found in PATH or fallback"
  exit 1
}
Write-Host "bun: $bunExe"

# Parse baseline
$parts = $Baseline -split '/'
if ($parts.Count -ne 3) { Write-Host "FAIL: bad baseline: $Baseline"; exit 1 }
$expPass = [int]$parts[0]
$expFail = [int]$parts[1]
$expExpect = [int]$parts[2]

Write-Host "=== gate-unit: $($files.Count) files ==="
Write-Host "baseline: $expPass / $expFail / $expExpect"
Write-Host "log: $logFile"

# Run bun test directly, redirect all streams
$bunArgs = @('test') + $files
& $bunExe @bunArgs *> $logFile
Write-Host "bun exit=$LASTEXITCODE"

# Parse summary lines from log
$pass = -1; $fail = -1; $expect = -1
foreach ($line in [System.IO.File]::ReadAllLines($logFile, [Text.Encoding]::UTF8)) {
  if ($line -match '^\s+(\d+)\s+pass\s*$') { $pass = [int]$Matches[1] }
  elseif ($line -match '^\s+(\d+)\s+fail\s*$') { $fail = [int]$Matches[1] }
  elseif ($line -match '^\s+(\d+)\s+expect\(\)\s*calls\s*$') { $expect = [int]$Matches[1] }
}

if ($pass -lt 0) { Write-Host "FAIL: could not parse pass count from log"; exit 1 }

Write-Host ""
Write-Host "=== result ==="
Write-Host "actual:  $pass / $fail / $expect"
Write-Host "expected: $expPass / $expFail / $expExpect"

if ($pass -eq $expPass -and $fail -eq $expFail -and $expect -eq $expExpect) {
  Write-Host "PASS"
  exit 0
} else {
  $dp = $pass - $expPass; $df = $fail - $expFail; $de = $expect - $expExpect
  Write-Host "FAIL: diff pass=$dp fail=$df expect=$de"
  exit 1
}

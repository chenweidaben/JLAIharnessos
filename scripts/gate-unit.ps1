# scripts/gate-unit.ps1 - P5 WORM+audit unit test gate
# Usage: .\scripts\gate-unit.ps1 [-Baseline "181/0/512"]
# Output: logs/gate-unit-<timestamp>.log
# Exit: 0=pass, 1=fail

param(
  [string]$Baseline = "181/0/512"
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

# Parse baseline
$parts = $Baseline -split '/'
if ($parts.Count -ne 3) { Write-Host "FAIL: bad baseline: $Baseline"; exit 1 }
$expPass = [int]$parts[0]
$expFail = [int]$parts[1]
$expExpect = [int]$parts[2]

Write-Host "=== gate-unit: $($files.Count) files ==="
Write-Host "baseline: $expPass / $expFail / $expExpect"
Write-Host "log: $logFile"

# 解析 bun 绝对路径：本机 PATH 未注册 bun，不能依赖 `bun` 能被解析
$bunExe = $null
$cmdBun = Get-Command bun -ErrorAction SilentlyContinue
if ($cmdBun) { $bunExe = $cmdBun.Source }
if (-not $bunExe) {
  $cand = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
  if (Test-Path -LiteralPath $cand) { $bunExe = $cand }
}
if (-not $bunExe) {
  Write-Host "FAIL: bun 未找到（PATH 与 %USERPROFILE%\.bun\bin\bun.exe 均不可用）"
  exit 1
}
Write-Host "bun: $bunExe"

# 直接调用 exe 并以 *> 重定向全部流到日志（不经过 cmd，避免引号与 PATH 问题）
$bunArgs = @('test') + $files
& $bunExe @bunArgs *> $logFile
Write-Host "bun exit=$LASTEXITCODE"

# Parse summary lines from log
$pass = -1; $fail = -1; $expect = -1
foreach ($line in [System.IO.File]::ReadAllLines($logFile)) {
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

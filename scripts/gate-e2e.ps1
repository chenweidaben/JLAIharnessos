# scripts/gate-e2e.ps1 - P5 WORM E2E gate
# Usage: .\scripts\gate-e2e.ps1 [-Baseline "23/0/83"]
# Output: logs/gate-e2e-<timestamp>.log
# Exit: 0=pass, 1=fail

param(
  [string]$Baseline = "23/0/83"
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $repoRoot "logs\gate-e2e-$ts.log"

# Parse baseline
$parts = $Baseline -split '/'
if ($parts.Count -ne 3) { Write-Host "FAIL: bad baseline: $Baseline"; exit 1 }
$expPass = [int]$parts[0]
$expFail = [int]$parts[1]
$expExpect = [int]$parts[2]

# Read DATABASE_URL from .env (length only, never echo)
$envFile = Join-Path $repoRoot '.env'
$dbUrl = ''
if (Test-Path -LiteralPath $envFile) {
  foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)\s*$') { $dbUrl = $Matches[1]; break }
  }
}
if (-not $dbUrl) { $dbUrl = "postgres://postgres:postgres@127.0.0.1:5433/jlmedaios" }

Write-Host "=== gate-e2e ==="
Write-Host "baseline: $expPass / $expFail / $expExpect"
Write-Host "log: $logFile"
Write-Host "DATABASE_URL len=$($dbUrl.Length)"

# Set env for E2E
$env:PORT = '8081'
$env:HTTP_PORT = '8081'
$env:DEMO_MODE = '1'
$env:AUDIT_STORE = 'pg'
$env:AUDIT_DB_SCHEMA = 'audit_e2e'
$env:WORM_BACKEND = 'memory'
$env:AUDIT_BACKFILL_LIMIT = '3000'
$env:DATABASE_URL = $dbUrl
# 不再内联 JWT_SECRET：bun 会自动加载 .env，脚本里硬编码密钥常量没有必要且有泄露面

# 解析 bun 绝对路径：本机 PATH 未注册 bun
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

# 直接调用 exe 并以 *> 重定向全部流到日志；不裸管道接 bun test
& $bunExe test './tests/integration/worm-e2e.test.ts' *> $logFile
Write-Host "bun exit=$LASTEXITCODE"

# Parse summary lines
$pass = -1; $fail = -1; $expect = -1
foreach ($line in [System.IO.File]::ReadAllLines($logFile)) {
  if ($line -match '^\s+(\d+)\s+pass\s*$') { $pass = [int]$Matches[1] }
  elseif ($line -match '^\s+(\d+)\s+fail\s*$') { $fail = [int]$Matches[1] }
  elseif ($line -match '^\s+(\d+)\s+expect\(\)\s*calls\s*$') { $expect = [int]$Matches[1] }
}

if ($pass -lt 0) { Write-Host "FAIL: could not parse pass count from log（用例可能根本没跑起来）"; exit 1 }

Write-Host ""
Write-Host "=== result ==="
Write-Host "actual:  $pass / $fail / $expect"
Write-Host "expected: $expPass / $expFail / $expExpect"

# Check port 8081 no leftover
Start-Sleep -Seconds 2
$portCheck = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($portCheck) {
  Write-Host "FAIL: port 8081 still listening (PID $($portCheck.OwningProcess -join ','))"
  exit 1
} else {
  Write-Host "port 8081: clean (no listener)"
}

if ($pass -eq $expPass -and $fail -eq $expFail -and $expect -eq $expExpect) {
  Write-Host "PASS"
  exit 0
} else {
  $dp = $pass - $expPass; $df = $fail - $expFail; $de = $expect - $expExpect
  Write-Host "FAIL: diff pass=$dp fail=$df expect=$de"
  exit 1
}

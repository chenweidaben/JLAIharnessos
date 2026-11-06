# scripts/env-doctor.ps1 - Read-only environment self-check
# Usage: .\scripts\env-doctor.ps1
# Exit: 0=ok, 1=bun/.env missing

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "=== env-doctor ==="

# node / bun / npm versions
Write-Host "`n--- versions ---"
$nodeVer = (node --version 2>$null)
Write-Host "node: $nodeVer"
$npmVer = (npm --version 2>$null)
Write-Host "npm: $npmVer"

# bun path resolution
Write-Host "`n--- bun path ---"
$bunCmd = Get-Command bun -ErrorAction SilentlyContinue
if ($bunCmd) {
  $bunPath = $bunCmd.Source
  Write-Host "bun (PATH): $bunPath"
} else {
  $bunFallback = "$env:USERPROFILE\.bun\bin\bun.exe"
  if (Test-Path -LiteralPath $bunFallback) {
    $bunPath = $bunFallback
    Write-Host "bun (fallback): $bunPath"
  } else {
    Write-Host "bun: NOT FOUND in PATH or fallback"
    Write-Host "FAIL: bun not resolvable"
    exit 1
  }
}
$bunVer = & $bunPath --version 2>$null
Write-Host "bun version: $bunVer"

# .env check
Write-Host "`n--- .env ---"
$envFile = Join-Path $repoRoot '.env'
if (Test-Path -LiteralPath $envFile) {
  Write-Host ".env: exists"
  $dbUrl = ''
  foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)\s*$') { $dbUrl = $Matches[1]; break }
  }
  Write-Host "DATABASE_URL len=$($dbUrl.Length)"
} else {
  Write-Host ".env: MISSING"
  exit 1
}

# Port check: 8080, 8081, 5173, 5174
Write-Host "`n--- ports ---"
foreach ($port in @(8080, 8081, 5173, 5174)) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    $pid_ = $conn.OwningProcess | Select-Object -First 1
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pid_" -ErrorAction SilentlyContinue
    $cmdLine = if ($proc) { $proc.CommandLine } else { '(unknown)' }
    $warn = ''
    if ($cmdLine -match 'src/bff/index\.ts') {
      $warn = '  [WARN: entry is index.ts shell, should be server.ts]'
    } elseif ($cmdLine -match 'src/bff/server\.ts') {
      $warn = ''
    } elseif ($cmdLine -match [regex]::Escape($repoRoot)) {
      $warn = ''
    } else {
      $warn = '  [WARN: port held by non-repo process]'
    }
    Write-Host "  ${port}: LISTENING pid=$pid_ cmd=$cmdLine$warn"
  } else {
    Write-Host "  ${port}: free"
  }
}

# 8080 health endpoints
Write-Host "`n--- 8080 health endpoints ---"
if (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue) {
  foreach ($ep in @('/health', '/ready', '/api/v1/health', '/api/v1/system/health', '/metrics')) {
    try {
      $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080$ep" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      Write-Host "  $ep : $($resp.StatusCode)"
    } catch {
      $code = $_.Exception.Response.StatusCode.value__
      Write-Host "  $ep : $code"
    }
  }
} else {
  Write-Host "  8080 not listening, skipping endpoint checks"
}

Write-Host "`nenv-doctor: done"
exit 0

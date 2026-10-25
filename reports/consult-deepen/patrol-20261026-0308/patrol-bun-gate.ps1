# 0308 轮 · bun 功能测试 + 覆盖率两段独立实跑（DEMO_MODE=1，进程内 DEMO 仓储，不连库不联网）
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0308"
$bun  = "C:\Users\lenovo\.bun\bin\bun.exe"
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$summary = Join-Path $log "patrol-bun-summary.log"
Set-Content -LiteralPath $summary -Value "=== consult bun gate $(Get-Date -Format 'HH:mm:ss') ===" -Encoding UTF8

$dirs = @("tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")

# 段 1：功能测试
$testOut = Join-Path $log "patrol-bun-test.log"
$testErr = Join-Path $log "patrol-bun-test-err.log"
$testArgs = @("test") + $dirs
$p1 = Start-Process -FilePath $bun -WorkingDirectory $root -ArgumentList $testArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $testOut -RedirectStandardError $testErr
$testCode = $p1.ExitCode
if ($null -eq $testCode) { $testCode = -1 }
Add-Content -LiteralPath $summary -Value "BUN_TEST EXIT=$testCode" -Encoding UTF8
Write-Host "BUN_TEST EXIT=$testCode"

# 段 2：覆盖率（变量名隔离，避免 Start-Process 重定向变量作用域异常）
$covOut = Join-Path $log "patrol-coverage.log"
$covErr = Join-Path $log "patrol-coverage-err.log"
$covArgs = @("test", "--coverage", "--coverage-reporter", "text") + $dirs
$p2 = Start-Process -FilePath $bun -WorkingDirectory $root -ArgumentList $covArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $covOut -RedirectStandardError $covErr
$covCode = $p2.ExitCode
if ($null -eq $covCode) { $covCode = -1 }
Add-Content -LiteralPath $summary -Value "COVERAGE EXIT=$covCode" -Encoding UTF8
Write-Host "COVERAGE EXIT=$covCode"

Write-Host "BUN_SUMMARY BUN_TEST=$testCode COVERAGE=$covCode"

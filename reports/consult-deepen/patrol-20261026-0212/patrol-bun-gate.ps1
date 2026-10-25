# 02:12 轮 bun 测试 + 覆盖率：Start-Process 取 ExitCode，DEMO_MODE=1，进程内仓储不连库
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$d = Join-Path $root "reports\consult-deepen\patrol-20261026-0212"
Set-Location $root
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$bun = "C:\Users\lenovo\.bun\bin\bun.exe"
$summary = Join-Path $d "patrol-bun-summary.log"
"=== bun gate $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Encoding utf8

$testDirs = @("tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")

# 1. 功能测试
$testOut = Join-Path $d "patrol-bun-test.log"
$testErr = Join-Path $d "patrol-bun-test-err.log"
$testArgs = @("test") + $testDirs
$p1 = Start-Process -FilePath $bun -ArgumentList $testArgs -WorkingDirectory $root -Wait -PassThru -NoNewWindow -RedirectStandardOutput $testOut -RedirectStandardError $testErr
$c1 = $p1.ExitCode
$line1 = "BUN_TEST_EXIT={0} | out={1}B err={2}B" -f $c1, (Get-Item -LiteralPath $testOut).Length, (Get-Item -LiteralPath $testErr).Length
$line1 | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Host $line1

# 2. 覆盖率
$covOut = Join-Path $d "patrol-coverage.log"
$covErr = Join-Path $d "patrol-coverage-err.log"
$covArgs = @("test", "--coverage", "--coverage-reporter", "text") + $testDirs
$p2 = Start-Process -FilePath $bun -ArgumentList $covArgs -WorkingDirectory $root -Wait -PassThru -NoNewWindow -RedirectStandardOutput $covOut -RedirectStandardError $covErr
$c2 = $p2.ExitCode
$line2 = "COVERAGE_EXIT={0} | out={1}B err={2}B" -f $c2, (Get-Item -LiteralPath $covOut).Length, (Get-Item -LiteralPath $covErr).Length
$line2 | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Host $line2

Set-Location $root
"=== bun done $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Append -Encoding utf8
Get-Content -LiteralPath $summary

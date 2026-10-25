# consult-agent 深化阶段 · 基线测试脚本（round 0）
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$log = Join-Path $root "reports\consult-deepen"
New-Item -ItemType Directory -Force -Path $log | Out-Null
$env:DEMO_MODE = "1"
$bun = "C:\Users\lenovo\.bun\bin\bun.exe"

$testDirs = @("tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")
$summary = Join-Path $log "baseline-test-round0.log"
"=== consult-agent deepen round0 baseline test $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Encoding utf8

$out = Join-Path $log "baseline-bun-consult-round0.log"
& $bun test @testDirs *> $out
$code = $LASTEXITCODE
"BUN_TEST_EXIT=$code | bun test consult three directories" | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Output "BUN_TEST_EXIT=$code"

# 提取统计行
$lines = Get-Content -LiteralPath $out
$stat = $lines | Where-Object { $_ -match "pass|fail|expect\(\)|tests across|seconds" }
$stat | ForEach-Object { "STAT|$_" | Out-File -LiteralPath $summary -Append -Encoding utf8 }

"=== round0 test done $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Append -Encoding utf8
Get-Content -LiteralPath $summary

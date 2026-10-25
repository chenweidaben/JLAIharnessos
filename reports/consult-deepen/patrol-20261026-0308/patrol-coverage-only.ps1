# 0308 轮 · bun 覆盖率单段独立实跑（DEMO_MODE=1，不连库不联网；bun text reporter 仅 Funcs/Lines/Uncovered）
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0308"
$bun  = "C:\Users\lenovo\.bun\bin\bun.exe"
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"

$cOut = Join-Path $log "patrol-coverage.log"
$cErr = Join-Path $log "patrol-coverage-err.log"
$cArg = @("test", "--coverage", "--coverage-reporter", "text", "tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")
$p = Start-Process -FilePath $bun -WorkingDirectory $root -ArgumentList $cArg -NoNewWindow -Wait -PassThru -RedirectStandardOutput $cOut -RedirectStandardError $cErr
$code = $p.ExitCode
if ($null -eq $code) { $code = -1 }
Add-Content -LiteralPath (Join-Path $log "patrol-bun-summary.log") -Value "COVERAGE EXIT=$code" -Encoding UTF8
Write-Host "COVERAGE EXIT=$code"

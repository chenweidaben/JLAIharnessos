# 2207 round - bun coverage standalone, DEMO_MODE=1; text reporter Funcs/Lines/Uncovered only
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261102-1707"
$bun  = "C:\Users\lenovo\.bun\bin\bun.exe"
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"

$cOut = Join-Path $log "patrol-coverage.log"
$cErr = Join-Path $log "patrol-coverage-err.log"
$cArg = @("test", "--coverage", "--coverage-reporter", "text", "tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath $bun -WorkingDirectory $root -ArgumentList $cArg -NoNewWindow -Wait -PassThru -RedirectStandardOutput $cOut -RedirectStandardError $cErr
$sw.Stop()
$code = $p.ExitCode
if ($null -eq $code) { $code = -1 }
$cOutLen = (Get-Item -LiteralPath $cOut).Length
$cErrLen = (Get-Item -LiteralPath $cErr).Length
$dur = [Math]::Round($sw.Elapsed.TotalSeconds, 2)
Add-Content -LiteralPath (Join-Path $log "patrol-bun-summary.log") -Value ("COVERAGE EXIT=$code OUT=${cOutLen}B ERR=${cErrLen}B DURATION=${dur}s") -Encoding UTF8
Write-Host "COVERAGE EXIT=$code DURATION=${dur}s"

# 0407 round - bun functional tests, standalone, DEMO_MODE=1, no db no network
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0407"
$bun  = "C:\Users\lenovo\.bun\bin\bun.exe"
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"

$out = Join-Path $log "patrol-bun-test.log"
$err = Join-Path $log "patrol-bun-test-err.log"
$arg = @("test", "tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")
$p = Start-Process -FilePath $bun -WorkingDirectory $root -ArgumentList $arg -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
$code = $p.ExitCode
if ($null -eq $code) { $code = -1 }
Set-Content -LiteralPath (Join-Path $log "patrol-bun-summary.log") -Value "BUN_TEST EXIT=$code" -Encoding UTF8
Write-Host "BUN_TEST EXIT=$code"

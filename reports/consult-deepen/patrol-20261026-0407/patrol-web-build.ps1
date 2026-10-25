# 0407 round - independent web build reproduction (tsc --noEmit && vite build), read-only build
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$web  = Join-Path $root "web"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0407"
$bun  = "C:\Users\lenovo\.bun\bin\bun.exe"
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"

$out = Join-Path $log "patrol-web-build-out.log"
$err = Join-Path $log "patrol-web-build-err.log"
$arg = @("run", "build")
$p = Start-Process -FilePath $bun -WorkingDirectory $web -ArgumentList $arg -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
$code = $p.ExitCode
if ($null -eq $code) { $code = -1 }
Add-Content -LiteralPath (Join-Path $log "patrol-build-summary.log") -Value "WEB_BUILD EXIT=$code" -Encoding UTF8
Write-Host "WEB_BUILD EXIT=$code"

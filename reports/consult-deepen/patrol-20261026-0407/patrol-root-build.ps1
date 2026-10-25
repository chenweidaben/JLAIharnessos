# 0407 round - independent root build reproduction (bun run build.ts), read-only build, no source edit
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0407"
$bun  = "C:\Users\lenovo\.bun\bin\bun.exe"
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"

$out = Join-Path $log "patrol-root-build-out.log"
$err = Join-Path $log "patrol-root-build-err.log"
$arg = @("run", "build.ts")
$p = Start-Process -FilePath $bun -WorkingDirectory $root -ArgumentList $arg -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
$code = $p.ExitCode
if ($null -eq $code) { $code = -1 }
Set-Content -LiteralPath (Join-Path $log "patrol-build-summary.log") -Value "ROOT_BUILD EXIT=$code" -Encoding UTF8
Write-Host "ROOT_BUILD EXIT=$code"

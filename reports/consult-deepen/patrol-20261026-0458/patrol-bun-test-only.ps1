# consult-agent closing review bun functional tests (DEMO_MODE=1, in-process demo repo)
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$logDir = Join-Path $root 'reports\consult-deepen\patrol-20261026-0458'
$env:DEMO_MODE = '1'
$env:NODE_OPTIONS = '--max-old-space-size=8192'
Set-Location $root
$bun = 'C:\Users\lenovo\.bun\bin\bun.exe'
$outLog = Join-Path $logDir 'patrol-bun-test.log'
$errLog = Join-Path $logDir 'patrol-bun-test-err.log'
$sw = [Diagnostics.Stopwatch]::StartNew()
$proc = Start-Process -FilePath $bun -ArgumentList @('test','tests/unit/consult-agent','tests/security/consult-agent','tests/integration/consult-agent') `
    -WorkingDirectory $root -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outLog -RedirectStandardError $errLog
$sw.Stop()
$exit = $proc.ExitCode
$outBytes = (Get-Item -LiteralPath $outLog).Length
$errBytes = (Get-Item -LiteralPath $errLog).Length
$line = ("{0} BUN_TEST EXIT={1} OUT={2}B ERR={3}B DURATION={4}s" -f `
    [DateTime]::Now.ToString('HH:mm:ss'), $exit, $outBytes, $errBytes, [math]::Round($sw.Elapsed.TotalSeconds,2))
$line | Set-Content -LiteralPath (Join-Path $logDir 'patrol-bun-summary.log') -Encoding ASCII
Write-Host $line
exit $exit

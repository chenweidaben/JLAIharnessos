# consult-agent closing review coverage run (DEMO_MODE=1, text reporter)
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$logDir = Join-Path $root 'reports\consult-deepen\patrol-20261026-0458'
$env:DEMO_MODE = '1'
$env:NODE_OPTIONS = '--max-old-space-size=8192'
Set-Location $root
$bun = 'C:\Users\lenovo\.bun\bin\bun.exe'
$outLog = Join-Path $logDir 'patrol-coverage.log'
$errLog = Join-Path $logDir 'patrol-coverage-err.log'
$sw = [Diagnostics.Stopwatch]::StartNew()
$proc = Start-Process -FilePath $bun -ArgumentList @('test','--coverage','--coverage-reporter','text','tests/unit/consult-agent','tests/security/consult-agent','tests/integration/consult-agent') `
    -WorkingDirectory $root -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outLog -RedirectStandardError $errLog
$sw.Stop()
$exit = $proc.ExitCode
$outBytes = (Get-Item -LiteralPath $outLog).Length
$errBytes = (Get-Item -LiteralPath $errLog).Length
$line = ("{0} COVERAGE EXIT={1} OUT={2}B ERR={3}B DURATION={4}s" -f `
    [DateTime]::Now.ToString('HH:mm:ss'), $exit, $outBytes, $errBytes, [math]::Round($sw.Elapsed.TotalSeconds,2))
$line | Set-Content -LiteralPath (Join-Path $logDir 'patrol-coverage-summary.log') -Encoding ASCII
Write-Host $line
exit $exit

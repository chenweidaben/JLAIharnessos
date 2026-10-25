$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$d = Join-Path $root "reports\consult-deepen\patrol-20261026-0212"
Set-Location $root
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$bun = "C:\Users\lenovo\.bun\bin\bun.exe"
$co = Join-Path $d "patrol-coverage.log"
$ce = Join-Path $d "patrol-coverage-err.log"
$covArgs = @("test", "--coverage", "--coverage-reporter", "text", "tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")
$p = Start-Process -FilePath $bun -ArgumentList $covArgs -WorkingDirectory $root -Wait -PassThru -NoNewWindow -RedirectStandardOutput $co -RedirectStandardError $ce
$code = $p.ExitCode
Write-Host ("COVERAGE_EXIT=" + $code + " out=" + (Get-Item -LiteralPath $co).Length + "B err=" + (Get-Item -LiteralPath $ce).Length + "B")

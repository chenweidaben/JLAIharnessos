# 02:12 轮静态门禁复核 v2：Start-Process -ArgumentList 数组逐元素传参；参数先入变量、单行调用
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$d = Join-Path $root "reports\consult-deepen\patrol-20261026-0212"
Set-Location $root
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$node = (Get-Command node).Source
$summary = Join-Path $d "patrol-static-recheck-summary.log"
"=== static recheck v2 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Encoding utf8

$beCore = @()
Get-ChildItem -LiteralPath (Join-Path $root "src/core/agent/consult") -Recurse -Filter "*.ts" -File | ForEach-Object { $beCore += $_.FullName.Substring($root.Length + 1).Replace("\", "/") }
$beRoute = "src/bff/routes/consultAgentRoutes.ts"
$beRepo = "src/db/repositories/consultAgentRepo.ts"
$feService = "web/src/services/api/consultAgent.ts"
$fePage = "web/src/pages/consult-agent/ConsultAgentChatPage.tsx"
$testFiles = @()
foreach ($td in @("tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")) {
  Get-ChildItem -LiteralPath (Join-Path $root $td) -Recurse -Filter "*.ts" -File | ForEach-Object { $testFiles += $_.FullName.Substring($root.Length + 1).Replace("\", "/") }
}
$beFiles = @($beCore) + @($beRoute, $beRepo)
$prettyFiles = @($beCore) + @($beRoute, $beRepo, $feService, $fePage) + $testFiles
$countLine = "beCore={0} beFiles={1} tests={2} pretty={3}" -f $beCore.Count, $beFiles.Count, $testFiles.Count, $prettyFiles.Count
$countLine | Out-File -LiteralPath $summary -Append -Encoding utf8
$prettyFiles | Sort-Object | Out-File -LiteralPath (Join-Path $d "prettier-file-list.txt") -Encoding utf8

function Run-Section {
  param([string]$Name, [string]$Cwd, [string[]]$ArgList, [string]$OutName)
  $out = Join-Path $d $OutName
  $err = Join-Path $d ($OutName -replace "\.log$", "-err.log")
  $proc = Start-Process -FilePath $node -ArgumentList $ArgList -WorkingDirectory $Cwd -Wait -PassThru -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err
  $code = $proc.ExitCode
  $line = "{0}_EXIT={1} | out={2}B err={3}B" -f $Name, $code, (Get-Item -LiteralPath $out).Length, (Get-Item -LiteralPath $err).Length
  $line | Out-File -LiteralPath $summary -Append -Encoding utf8
  Write-Host $line
}

$beArgs = @("node_modules/eslint/bin/eslint.js") + $beFiles + @("--max-warnings", "0")
Run-Section "ESLINT_BE" $root $beArgs "patrol-eslint-be.log"

$localArgs = @("node_modules/eslint/bin/eslint.js", "src/services/api/consultAgent.ts", "src/pages/consult-agent/ConsultAgentChatPage.tsx", "--max-warnings", "0")
Run-Section "ESLINT_FE_LOCAL" (Join-Path $root "web") $localArgs "patrol-eslint-fe-local.log"

$preArgs = @("node_modules/prettier/bin/prettier.cjs", "--check") + $prettyFiles
Run-Section "PRETTIER" $root $preArgs "patrol-prettier.log"

Set-Location $root
"=== recheck v2 done $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Append -Encoding utf8
Get-Content -LiteralPath $summary

$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$prettier = ".\node_modules\.bin\prettier.cmd"
$webEslint = ".\web\node_modules\.bin\eslint.cmd"
$webTsc = ".\web\node_modules\.bin\tsc.cmd"
$logs = "reports\consult-rebuild"
$gateLog = "$logs\patrol-2335-gate4.log"
if (Test-Path $gateLog) { Remove-Item $gateLog -Force }

# collect backend consult files explicitly (no directory glob)
$be = @()
$be += Get-ChildItem -LiteralPath "src\core\agent\consult" -Recurse -Filter *.ts | ForEach-Object { $_.FullName.Replace($root+'\','').Replace('\','/') }
$be += "src/bff/routes/consultAgentRoutes.ts"
$be += "src/db/repositories/consultAgentRepo.ts"
$be += Get-ChildItem -LiteralPath "tests\unit\consult-agent" -Recurse -Filter *.ts | ForEach-Object { $_.FullName.Replace($root+'\','').Replace('\','/') }
$be += Get-ChildItem -LiteralPath "tests\security\consult-agent" -Recurse -Filter *.ts | ForEach-Object { $_.FullName.Replace($root+'\','').Replace('\','/') }
$be += Get-ChildItem -LiteralPath "tests\integration\consult-agent" -Recurse -Filter *.ts | ForEach-Object { $_.FullName.Replace($root+'\','').Replace('\','/') }
Add-Content -LiteralPath $gateLog -Value ("backend file count=" + $be.Count) -Encoding UTF8

$webFiles = @("src/pages/consult-agent/ConsultAgentChatPage.tsx", "src/services/api/consultAgent.ts")

function Run($title, $cmd, $args, $cwd) {
  $prev = Get-Location
  if ($cwd) { Set-Location $cwd }
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  $out = & $cmd @args 2>&1
  $code = $LASTEXITCODE
  Set-Location $prev
  $text = ($out | Out-String)
  Add-Content -LiteralPath $gateLog -Value "===== $title =====`nEXIT=$code`n$text" -Encoding UTF8
  Write-Output ("$title EXIT=$code")
  return $code
}

Run "backend consult prettier --check (55 explicit files)" $prettier (@("--check") + $be) $root | Out-Null
Run "web tsc --noEmit" $webTsc @("--noEmit") "$root\web" | Out-Null
Run "web eslint local --max-warnings 0" $webEslint (@("--max-warnings","0") + $webFiles) "$root\web" | Out-Null
Run "web prettier --check" $prettier (@("--check") + $webFiles) "$root\web" | Out-Null

Write-Output "`n===== gate4 EXIT summary ====="
Get-Content -LiteralPath $gateLog -Encoding UTF8 | Select-String -Pattern "EXIT=|=====|file count"

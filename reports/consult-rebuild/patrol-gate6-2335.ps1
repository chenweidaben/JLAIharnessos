$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$logs = "reports\consult-rebuild"
$gateLog = "$logs\patrol-2335-gate6.log"
if (Test-Path $gateLog) { Remove-Item $gateLog -Force }

$be = @()
$be += Get-ChildItem -LiteralPath "src\core\agent\consult" -Recurse -Filter *.ts | ForEach-Object { $_.FullName.Replace($root+'\','').Replace('\','/') }
$be += "src/bff/routes/consultAgentRoutes.ts"
$be += "src/db/repositories/consultAgentRepo.ts"
$be += Get-ChildItem -LiteralPath "tests\unit\consult-agent" -Recurse -Filter *.ts | ForEach-Object { $_.FullName.Replace($root+'\','').Replace('\','/') }
$be += Get-ChildItem -LiteralPath "tests\security\consult-agent" -Recurse -Filter *.ts | ForEach-Object { $_.FullName.Replace($root+'\','').Replace('\','/') }
$be += Get-ChildItem -LiteralPath "tests\integration\consult-agent" -Recurse -Filter *.ts | ForEach-Object { $_.FullName.Replace($root+'\','').Replace('\','/') }
$webFiles = @("src/pages/consult-agent/ConsultAgentChatPage.tsx", "src/services/api/consultAgent.ts")
Add-Content -LiteralPath $gateLog -Value ("backend file count=" + $be.Count + " web file count=" + $webFiles.Count) -Encoding UTF8

function RunNode($title, $nodeScript, $args, $cwd) {
  $prev = Get-Location
  if ($cwd) { Set-Location $cwd }
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  $out = & node $nodeScript @args 2>&1
  $code = $LASTEXITCODE
  Set-Location $prev
  $text = ($out | Out-String)
  Add-Content -LiteralPath $gateLog -Value "===== $title =====`nEXIT=$code`n$text" -Encoding UTF8
  Write-Output ("$title EXIT=$code")
  return $code
}

RunNode "backend consult prettier --check (55 files)" "node_modules/prettier/bin/prettier.cjs" (@("--check") + $be) $root | Out-Null
RunNode "web tsc --noEmit" "node_modules/typescript/bin/tsc" @("--noEmit") "$root\web" | Out-Null
RunNode "web eslint local --max-warnings 0" "node_modules/eslint/bin/eslint.js" (@("--max-warnings","0") + $webFiles) "$root\web" | Out-Null
RunNode "web prettier --check" "node_modules/prettier/bin/prettier.cjs" (@("--check") + $webFiles) "$root\web" | Out-Null

Write-Output "`n===== gate6 EXIT summary ====="
Get-Content -LiteralPath $gateLog -Encoding UTF8 | Select-String -Pattern "EXIT=|=====|file count|Prettier|format"

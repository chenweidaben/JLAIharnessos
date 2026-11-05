$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$logs = "reports\consult-rebuild"
$gateLog = "$logs\patrol-2335-gate7.log"
if (Test-Path $gateLog) { Remove-Item $gateLog -Force }

function Rel([string]$full) {
  return $full.Substring($root.Length + 1).Replace('\', '/')
}

$be = @()
$be += Get-ChildItem -LiteralPath "src\core\agent\consult" -Recurse -Filter *.ts | ForEach-Object { Rel $_.FullName }
$be += "src/bff/routes/consultAgentRoutes.ts"
$be += "src/db/repositories/consultAgentRepo.ts"
$be += Get-ChildItem -LiteralPath "tests\unit\consult-agent" -Recurse -Filter *.ts | ForEach-Object { Rel $_.FullName }
$be += Get-ChildItem -LiteralPath "tests\security\consult-agent" -Recurse -Filter *.ts | ForEach-Object { Rel $_.FullName }
$be += Get-ChildItem -LiteralPath "tests\integration\consult-agent" -Recurse -Filter *.ts | ForEach-Object { Rel $_.FullName }
$webFiles = @("src/pages/consult-agent/ConsultAgentChatPage.tsx", "src/services/api/consultAgent.ts")
Add-Content -LiteralPath $gateLog -Value ("backend file count=" + $be.Count + " web file count=" + $webFiles.Count) -Encoding UTF8

function RunNode($title, $nodeScript, $argList, $cwd) {
  $prev = Get-Location
  if ($cwd) { Set-Location $cwd }
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  $out = & node $nodeScript @argList 2>&1
  $code = $LASTEXITCODE
  Set-Location $prev
  $text = ($out | Out-String)
  Add-Content -LiteralPath $gateLog -Value "===== $title =====`nEXIT=$code`n$text" -Encoding UTF8
  Write-Output ("$title EXIT=$code")
}

RunNode "backend consult prettier --check (55 files)" "node_modules/prettier/bin/prettier.cjs" (@("--check") + $be) $root
RunNode "web tsc --noEmit" "node_modules/typescript/bin/tsc" @("--noEmit") "$root\web"
RunNode "web eslint local --max-warnings 0" "node_modules/eslint/bin/eslint.js" (@("--max-warnings","0") + $webFiles) "$root\web"
RunNode "web prettier --check" "node_modules/prettier/bin/prettier.cjs" (@("--check") + $webFiles) "$root\web"

Write-Output "===== gate7 EXIT summary ====="
Get-Content -LiteralPath $gateLog -Encoding UTF8 | Select-String -Pattern "EXIT=|=====|file count|All matched|would be"

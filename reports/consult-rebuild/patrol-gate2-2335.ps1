$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$bun = "C:\Users\lenovo\.bun\bin\bun.exe"
$eslint = ".\node_modules\.bin\eslint.cmd"
$prettier = ".\node_modules\.bin\prettier.cmd"
$webEslint = ".\web\node_modules\.bin\eslint.cmd"
$webTsc = ".\web\node_modules\.bin\tsc.cmd"
$logs = "reports\consult-rebuild"

$bePaths = @(
  "src/core/agent/consult",
  "src/bff/routes/consultAgentRoutes.ts",
  "src/db/repositories/consultAgentRepo.ts",
  "tests/unit/consult-agent",
  "tests/security/consult-agent",
  "tests/integration/consult-agent"
)
$beGlob = @(
  "src/core/agent/consult/**/*.ts",
  "src/bff/routes/consultAgentRoutes.ts",
  "src/db/repositories/consultAgentRepo.ts",
  "tests/unit/consult-agent/**/*.ts",
  "tests/security/consult-agent/**/*.ts",
  "tests/integration/consult-agent/**/*.ts"
)
$webFiles = @(
  "web/src/pages/consult-agent/ConsultAgentChatPage.tsx",
  "web/src/services/api/consultAgent.ts"
)
$webGlob = @(
  "src/pages/consult-agent/**/*.tsx",
  "src/services/api/consultAgent.ts"
)

$gateLog = "$logs\patrol-2335-gate2.log"
if (Test-Path $gateLog) { Remove-Item $gateLog -Force }
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue

function Run($title, $cmd, $args, $cwd) {
  $prev = Get-Location
  if ($cwd) { Set-Location $cwd }
  $out = & $cmd @args 2>&1
  $code = $LASTEXITCODE
  Set-Location $prev
  $text = ($out | Out-String)
  Add-Content -LiteralPath $gateLog -Value "===== $title =====`nEXIT=$code`n$text" -Encoding UTF8
  Write-Output ("$title EXIT=$code")
  return $code
}

# root tsc already EXIT=0 this round (patrol-2335-gate.log item 1); rerun for standalone confirmation
Run "root tsc --noEmit" ".\node_modules\.bin\tsc.cmd" @("--noEmit") $root | Out-Null
Run "backend consult eslint root config --max-warnings 0" $eslint (@("--max-warnings","0") + $bePaths) $root | Out-Null
Run "backend consult prettier --check" $prettier (@("--check") + $beGlob) $root | Out-Null
Run "web tsc --noEmit" $webTsc @("--noEmit") "$root\web" | Out-Null
Run "web eslint local --max-warnings 0" $webEslint (@("--max-warnings","0") + $webGlob) "$root\web" | Out-Null
Run "web prettier --check" $prettier (@("--check") + $webGlob) $root | Out-Null

Write-Output "`n===== gate2 EXIT summary ====="
Get-Content -LiteralPath $gateLog -Encoding UTF8 | Select-String -Pattern "EXIT=|====="

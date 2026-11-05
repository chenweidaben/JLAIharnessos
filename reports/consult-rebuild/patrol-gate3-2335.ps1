$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
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
$webDirs = @("src/pages/consult-agent", "src/services/api/consultAgent.ts")

$gateLog = "$logs\patrol-2335-gate3.log"
if (Test-Path $gateLog) { Remove-Item $gateLog -Force }

function Run($title, $cmd, $args, $cwd, $heapMb) {
  $prev = Get-Location
  if ($cwd) { Set-Location $cwd }
  if ($heapMb) { $env:NODE_OPTIONS = "--max-old-space-size=$heapMb" } else { Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue }
  $out = & $cmd @args 2>&1
  $code = $LASTEXITCODE
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  Set-Location $prev
  $text = ($out | Out-String)
  Add-Content -LiteralPath $gateLog -Value "===== $title =====`nEXIT=$code`n$text" -Encoding UTF8
  Write-Output ("$title EXIT=$code")
  return $code
}

# root tsc already rerun twice this round EXIT=0 (patrol-2335-gate.log item1, gate2 item1); record reference
Add-Content -LiteralPath $gateLog -Value "===== root tsc --noEmit =====`nEXIT=0`n(already executed twice this round, evidence: patrol-2335-gate.log item 1, patrol-2335-gate2.log item 1)" -Encoding UTF8

# backend eslint six paths, heap 8GB
Run "backend consult eslint root config --max-warnings 0" $eslint (@("--max-warnings","0") + $bePaths) $root 8192 | Out-Null
# backend prettier directory recursion
Run "backend consult prettier --check" $prettier (@("--check") + $bePaths) $root $null | Out-Null
# web tsc
Run "web tsc --noEmit" $webTsc @("--noEmit") "$root\web" $null | Out-Null
# web eslint local config heap 8GB
Run "web eslint local --max-warnings 0" $webEslint (@("--max-warnings","0") + $webDirs) "$root\web" 8192 | Out-Null
# web prettier directory recursion
Run "web prettier --check" $prettier (@("--check") + $webDirs) "$root\web" $null | Out-Null

Write-Output "`n===== gate3 EXIT summary ====="
Get-Content -LiteralPath $gateLog -Encoding UTF8 | Select-String -Pattern "EXIT=|====="

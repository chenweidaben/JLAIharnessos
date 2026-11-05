$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$logs = "reports\consult-rebuild"
$gateLog = "$logs\patrol-2335-gate8.log"
if (Test-Path $gateLog) { Remove-Item $gateLog -Force }

$newTests = @(
  "tests/unit/consult-agent/audit.test.ts",
  "tests/unit/consult-agent/consultAgentRepo.test.ts",
  "tests/unit/consult-agent/ddlSchema.test.ts",
  "tests/unit/consult-agent/orchestratorBranches.test.ts",
  "tests/unit/consult-agent/profileMemoryBranches.test.ts",
  "tests/unit/consult-agent/roleSupport.test.ts",
  "tests/unit/consult-agent/safeLlm.test.ts",
  "tests/unit/consult-agent/sessionRuntime.test.ts",
  "tests/unit/consult-agent/supervisorBranch.test.ts",
  "tests/unit/consult-agent/toolRegistryBranches.test.ts",
  "tests/integration/consult-agent/consultRouteErrors.test.ts"
)
$deliv = @("src/core/agent/consult", "src/bff/routes/consultAgentRoutes.ts", "src/db/repositories/consultAgentRepo.ts")
$targets = $deliv + $newTests

$env:NODE_OPTIONS = "--max-old-space-size=8192"
$out = & node "node_modules/eslint/bin/eslint.js" --max-warnings 0 $targets 2>&1
$code = $LASTEXITCODE
$env:NODE_OPTIONS = ""
$text = ($out | Out-String)
Set-Content -LiteralPath $gateLog -Value "===== gate8 consult delivery + new tests eslint root config --max-warnings 0 =====`nEXIT=$code`n$text" -Encoding UTF8
Write-Output ("GATE8_EXIT=$code")

# classify: count problem lines grouped by file header
$lines = Get-Content -LiteralPath $gateLog -Encoding UTF8
$cur = ""; $delivProblems = 0; $otherProblems = 0
foreach ($ln in $lines) {
  if ($ln -match '^\s*C:\\Users') { $cur = $ln }
  if ($ln -match 'error|warning') {
    if ($cur -match 'agent\\consult|consultAgentRoutes|consultAgentRepo|consult-agent') { $delivProblems++ }
    else { $otherProblems++ }
  }
}
Add-Content -LiteralPath $gateLog -Value "`nDELIVERY_PATH_PROBLEMS=$delivProblems`nOTHER_PATH_PROBLEMS=$otherProblems" -Encoding UTF8
Write-Output ("DELIVERY_PATH_PROBLEMS=$delivProblems OTHER_PATH_PROBLEMS=$otherProblems")

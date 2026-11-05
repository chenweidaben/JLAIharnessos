$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$bun = "C:\Users\lenovo\.bun\bin\bun.exe"
$env:DEMO_MODE = "1"
$logs = "reports\consult-rebuild"
$outLog = "$logs\patrol-2335-exits.log"
if (Test-Path $outLog) { Remove-Item $outLog -Force }

$groups = @(
  @{ Name = "consult"; Targets = @("tests/unit/consult-agent","tests/security/consult-agent","tests/integration/consult-agent") },
  @{ Name = "bclass"; Targets = @("tests/unit/apiDocs.test.ts","tests/unit/twin3DInpatient.test.ts","tests/unit/bff/demoModeGuard.test.ts","tests/unit/bff/prodDemoFailClosed.test.ts","tests/unit/core/SystemPromptBuilder.test.ts","tests/unit/auditReport.test.ts","tests/unit/security/audit.test.ts","tests/unit/security/encryption.test.ts") },
  @{ Name = "legacy"; Targets = @("tests/unit/onlineConsult.test.ts","tests/unit/db/ddl.test.ts") }
)

foreach ($g in $groups) {
  $out = & $bun test @($g.Targets) 2>&1
  $code = $LASTEXITCODE
  Add-Content -LiteralPath $outLog -Value ("$($g.Name)_EXIT=$code") -Encoding UTF8
  $summary = ($out | Where-Object { "$_" -match "pass|fail|expect|Ran" } | Select-Object -Last 3)
  foreach ($s in $summary) { Add-Content -LiteralPath $outLog -Value ("  " + "$s") -Encoding UTF8 }
  Write-Output ("$($g.Name)_EXIT=$code")
}

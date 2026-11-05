$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$bun = "C:\Users\lenovo\.bun\bin\bun.exe"
$env:DEMO_MODE = "1"
$logs = "reports\consult-rebuild"

$consultDirs = @(
  "tests/unit/consult-agent",
  "tests/security/consult-agent",
  "tests/integration/consult-agent"
)
$bclassFiles = @(
  "tests/unit/apiDocs.test.ts",
  "tests/unit/twin3DInpatient.test.ts",
  "tests/unit/bff/demoModeGuard.test.ts",
  "tests/unit/bff/prodDemoFailClosed.test.ts",
  "tests/unit/core/SystemPromptBuilder.test.ts",
  "tests/unit/auditReport.test.ts",
  "tests/unit/security/audit.test.ts",
  "tests/unit/security/encryption.test.ts"
)
$legacyFiles = @(
  "tests/unit/onlineConsult.test.ts",
  "tests/unit/db/ddl.test.ts"
)

function RunBun($title, $targets, $logFile) {
  $out = & $bun test @targets 2>&1
  $code = $LASTEXITCODE
  $text = ($out | Out-String)
  Set-Content -LiteralPath "$logs\$logFile" -Value $text -Encoding UTF8
  Write-Output ("$title EXIT=$code")
  # extract summary line
  $summary = ($out | Where-Object { $_ -match "pass|fail|expect" } | Select-Object -Last 3)
  $summary | ForEach-Object { Write-Output ("  " + $_.Trim()) }
  return $code
}

RunBun "consult three suites" $consultDirs "patrol-2335-test.log" | Out-Null
RunBun "B-class regression eight files" $bclassFiles "patrol-2335-bclass.log" | Out-Null
RunBun "legacy baseline two files" $legacyFiles "patrol-2335-legacy.log" | Out-Null

Write-Output "`n===== test summary ====="
foreach ($f in @("patrol-2335-test.log","patrol-2335-bclass.log","patrol-2335-legacy.log")) {
  Write-Output "--- $f ---"
  Get-Content -LiteralPath "$logs\$f" -Encoding UTF8 | Where-Object { $_ -match "pass|fail|expect|error|Error" } | Select-Object -Last 6
}

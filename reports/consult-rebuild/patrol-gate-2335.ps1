$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$bun = "C:\Users\lenovo\.bun\bin\bun.exe"
$tsc = ".\node_modules\.bin\tsc.cmd"
$eslint = ".\node_modules\.bin\eslint.cmd"
$prettier = ".\node_modules\.bin\prettier.cmd"
$webEslint = ".\web\node_modules\.bin\eslint.cmd"
$webTsc = ".\web\node_modules\.bin\tsc.cmd"
$logs = "reports\consult-rebuild"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

$beCore = @("src/core/agent/consult")
$beRest = @(
  "src/bff/routes/consultAgentRoutes.ts",
  "src/db/repositories/consultAgentRepo.ts",
  "tests/unit/consult-agent",
  "tests/security/consult-agent",
  "tests/integration/consult-agent"
)
$beAll = $beCore + $beRest
$webFiles = @(
  "web/src/pages/consult-agent/ConsultAgentChatPage.tsx",
  "web/src/services/api/consultAgent.ts"
)

$gateLog = "$logs\patrol-2335-gate.log"
if (Test-Path $gateLog) { Remove-Item $gateLog -Force }

function Run-Gate($title, $cmd, $args, $cwd, $heapMb) {
  $prev = Get-Location
  if ($cwd) { Set-Location $cwd }
  if ($heapMb) { $env:NODE_OPTIONS = "--max-old-space-size=$heapMb" } else { Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue }
  $out = & $cmd @args 2>&1
  $code = $LASTEXITCODE
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  Set-Location $prev
  $line = "===== $title =====`nEXIT=$code`n" + ($out | Out-String)
  Add-Content -LiteralPath $gateLog -Value $line -Encoding UTF8
  Write-Output ("$title EXIT=$code")
  return $code
}

# 1 root tsc
Run-Gate "1 root tsc --noEmit" $tsc @("--noEmit") $root $null | Out-Null
# 2a backend consult eslint batch A core (heap 8GB)
Run-Gate "2a backend consult eslint core --max-warnings 0" $eslint (@("--max-warnings","0") + $beCore) $root 8192 | Out-Null
# 2b backend consult eslint batch B routes/repo/tests (heap 8GB)
Run-Gate "2b backend consult eslint routes-repo-tests --max-warnings 0" $eslint (@("--max-warnings","0") + $beRest) $root 8192 | Out-Null
# 3 backend consult prettier check
Run-Gate "3 backend consult prettier --check" $prettier (@("--check") + $beAll) $root $null | Out-Null
# 4 web tsc
Run-Gate "4 web tsc --noEmit" $webTsc @("--noEmit") "$root\web" $null | Out-Null
# 5 web eslint local config
Run-Gate "5 web eslint local --max-warnings 0" $webEslint (@("--max-warnings","0") + $webFiles) "$root\web" 8192 | Out-Null
# 6 web prettier check
Run-Gate "6 web prettier --check" $prettier (@("--check") + $webFiles) $root $null | Out-Null

Write-Output "`n===== gate EXIT summary ====="
Get-Content -LiteralPath $gateLog -Encoding UTF8 | Select-String -Pattern "EXIT=|====="

# ---- tests ----
$env:DEMO_MODE = "1"

function Run-Test($title, $file, $paths) {
  $log = "$logs\$file"
  $out = & $bun test @paths 2>&1
  $code = $LASTEXITCODE
  ($out | Out-String) | Set-Content -LiteralPath $log -Encoding UTF8
  $text = ($out | Out-String)
  $pass = [regex]::Match($text, "(\d+)\s+pass").Groups[1].Value
  $fail = [regex]::Match($text, "(\d+)\s+fail").Groups[1].Value
  $expect = [regex]::Match($text, "(\d+)\s+expect").Groups[1].Value
  $files = [regex]::Match($text, "(\d+)\s+files?").Groups[1].Value
  $dur = [regex]::Match($text, "([\d.]+)\s*s").Groups[1].Value
  Write-Output ("$title EXIT=$code pass=$pass fail=$fail expect=$expect files=$files dur=${dur}s")
  Add-Content -LiteralPath $gateLog -Value "`n$title EXIT=$code pass=$pass fail=$fail expect=$expect files=$files dur=${dur}s" -Encoding UTF8
  return @{ exit=$code; pass=$pass; fail=$fail; expect=$expect; files=$files; dur=$dur }
}

$consult = Run-Test "consult unit+security+integration" "patrol-2335-test.log" @("tests/unit/consult-agent","tests/security/consult-agent","tests/integration/consult-agent")

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
$bclass = Run-Test "B-class regression 8 files" "patrol-2335-bclass.log" $bclassFiles

$legacyFiles = @("tests/unit/onlineConsult.test.ts","tests/unit/db/ddl.test.ts")
$legacy = Run-Test "legacy baseline 2 files (expected EXIT=1)" "patrol-2335-legacy.log" $legacyFiles

Write-Output "`n===== test summary ====="
Write-Output ("CONSULT pass={0} fail={1} expect={2} files={3} dur={4}s EXIT={5}" -f $consult.pass,$consult.fail,$consult.expect,$consult.files,$consult.dur,$consult.exit)
Write-Output ("BCLASS pass={0} fail={1} expect={2} files={3} dur={4}s EXIT={5}" -f $bclass.pass,$bclass.fail,$bclass.expect,$bclass.files,$bclass.dur,$bclass.exit)
Write-Output ("LEGACY pass={0} fail={1} expect={2} files={3} dur={4}s EXIT={5}" -f $legacy.pass,$legacy.fail,$legacy.expect,$legacy.files,$legacy.dur,$legacy.exit)

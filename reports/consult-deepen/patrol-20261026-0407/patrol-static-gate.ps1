# consult patrol 0407 round - seven static gate sections, real exit codes from $proc.ExitCode
# PS5.1 / Windows; Bash disabled; node direct call, no .cmd
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$log  = Join-Path $root "reports\consult-deepen\patrol-20261026-0407"
$node = "C:\Users\lenovo\AppData\Local\Doubao\User Data\sandbox_runtime\bases\772984f6fd3a8ae0ae7d2422cd7c2bfa\node\node.exe"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$env:DEMO_MODE = "1"

$coreDirAbs = Join-Path $root "src\core\agent\consult"
$coreFiles = @()
$coreHits = Get-ChildItem -LiteralPath $coreDirAbs -Recurse -Filter "*.ts" -File
foreach ($hit in $coreHits) {
  $rel = $hit.FullName.Substring($root.Length + 1).Replace('\', '/')
  $coreFiles += $rel
}
if ($coreFiles.Count -eq 0) { throw "core dir has no .ts files" }

$beRoute = "src/bff/routes/consultAgentRoutes.ts"
$beRepo  = "src/db/repositories/consultAgentRepo.ts"
$feService = "web/src/services/api/consultAgent.ts"
$fePage    = "web/src/pages/consult-agent/ConsultAgentChatPage.tsx"

$testFiles = @()
foreach ($d in @("tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")) {
  $dirRel = $d -replace '/', '\'
  $dirAbs = Join-Path $root $dirRel
  $hits = Get-ChildItem -LiteralPath $dirAbs -Recurse -Filter "*.ts" -File
  foreach ($hit in $hits) {
    $rel = $hit.FullName.Substring($root.Length + 1).Replace('\', '/')
    $testFiles += $rel
  }
}

$beFiles = @($coreFiles) + @($beRoute, $beRepo)
$prettyFiles = @($coreFiles) + @($beRoute, $beRepo, $feService, $fePage) + $testFiles
Set-Content -LiteralPath (Join-Path $log "prettier-file-list.txt") -Value $prettyFiles -Encoding UTF8

$rootTsc = "node_modules/typescript/lib/tsc.js"
$rootEslint = "node_modules/eslint/bin/eslint.js"
$rootPrettier = "node_modules/prettier/bin/prettier.cjs"
$webEslint = "node_modules/eslint/bin/eslint.js"
$webTsc = "node_modules/typescript/lib/tsc.js"

$summary = Join-Path $log "patrol-static-summary.log"
$stamp = Get-Date -Format 'HH:mm:ss'
Set-Content -LiteralPath $summary -Value "=== consult static gate $stamp ===" -Encoding UTF8

function Run-Section {
  param([string]$section, [string]$workdir, [string]$exe, [string]$script, [string[]]$aList, [string]$outName, [string]$errName)
  $out = Join-Path $log $outName
  $err = Join-Path $log $errName
  $argList = @($script) + $aList
  $proc = Start-Process -FilePath $exe -WorkingDirectory $workdir -ArgumentList $argList -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
  $code = $proc.ExitCode
  if ($null -eq $code) { $code = -1 }
  $health = "ok"
  if ($code -ne 0) { $health = "FAIL" }
  $line = "$section EXIT=$code health=$health args=$($aList.Count)"
  Add-Content -LiteralPath $summary -Value $line -Encoding UTF8
  Write-Host $line
  return $code
}

$c1 = Run-Section -section "TSC_ROOT" -workdir $root -exe $node -script $rootTsc -aList @("--noEmit") -outName "patrol-tsc.log" -errName "patrol-tsc-err.log"
$c2 = Run-Section -section "ESLINT_BE" -workdir $root -exe $node -script $rootEslint -aList (@($beFiles) + @("--max-warnings", "0")) -outName "patrol-eslint-be.log" -errName "patrol-eslint-be-err.log"
$c3 = Run-Section -section "ESLINT_FE_ROOT_SERVICE" -workdir $root -exe $node -script $rootEslint -aList @($feService, "--max-warnings", "0") -outName "patrol-eslint-fe-root-service.log" -errName "patrol-eslint-fe-root-service-err.log"
$c4 = Run-Section -section "ESLINT_FE_ROOT_PAGE" -workdir $root -exe $node -script $rootEslint -aList @($fePage, "--max-warnings", "0") -outName "patrol-eslint-fe-root-page.log" -errName "patrol-eslint-fe-root-page-err.log"

$webRoot = Join-Path $root "web"
$c5 = Run-Section -section "ESLINT_FE_LOCAL" -workdir $webRoot -exe $node -script $webEslint -aList @("src/services/api/consultAgent.ts", "src/pages/consult-agent/ConsultAgentChatPage.tsx") -outName "patrol-eslint-fe-local.log" -errName "patrol-eslint-fe-local-err.log"
$c6 = Run-Section -section "TSC_WEB" -workdir $webRoot -exe $node -script $webTsc -aList @("--noEmit") -outName "patrol-tsc-web.log" -errName "patrol-tsc-web-err.log"
$c7 = Run-Section -section "PRETTIER" -workdir $root -exe $node -script $rootPrettier -aList (@("--check") + $prettyFiles) -outName "patrol-prettier.log" -errName "patrol-prettier-err.log"

$codes = [ordered]@{ TSC_ROOT=$c1; ESLINT_BE=$c2; ESLINT_FE_ROOT_SERVICE=$c3; ESLINT_FE_ROOT_PAGE=$c4; ESLINT_FE_LOCAL=$c5; TSC_WEB=$c6; PRETTIER=$c7 }
$failure = @($codes.Keys | Where-Object { $codes[$_] -ne 0 })
Add-Content -LiteralPath $summary -Value "=== sections: $($codes.Count) | failures: $($failure.Count) ===" -Encoding UTF8
foreach ($k in $codes.Keys) { Add-Content -LiteralPath $summary -Value "$k=$($codes[$k])" -Encoding UTF8 }
Write-Host "SUMMARY failures=$($failure.Count) $($failure -join ',')"

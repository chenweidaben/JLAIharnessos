# 02:12 轮静态门禁复核：BE ESLint / FE local ESLint / Prettier 57 文件；块作用域隔离 $log，避免污染
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$d = Join-Path $root "reports\consult-deepen\patrol-20261026-0212"
Set-Location $root
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$node = (Get-Command node).Source
$summary = Join-Path $d "patrol-static-recheck-summary.log"
"=== static recheck $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Encoding utf8

# 全量 consult 源文件清单（57：26 core + 2 be + 2 fe + 27 tests 含 helpers.ts）
$beCore = @()
Get-ChildItem -LiteralPath (Join-Path $root "src/core/agent/consult") -Recurse -Filter "*.ts" -File |
  ForEach-Object { $beCore += $_.FullName.Substring($root.Length + 1).Replace("\", "/") }
$beRoute = "src/bff/routes/consultAgentRoutes.ts"
$beRepo  = "src/db/repositories/consultAgentRepo.ts"
$feService = "web/src/services/api/consultAgent.ts"
$fePage    = "web/src/pages/consult-agent/ConsultAgentChatPage.tsx"
$testFiles = @()
foreach ($td in @("tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")) {
  Get-ChildItem -LiteralPath (Join-Path $root $td) -Recurse -Filter "*.ts" -File |
    ForEach-Object { $testFiles += $_.FullName.Substring($root.Length + 1).Replace("\", "/") }
}
$beFiles = @($beCore) + @($beRoute, $beRepo)
$prettyFiles = @($beCore) + @($beRoute, $beRepo, $feService, $fePage) + $testFiles
"beCore=$($beCore.Count) tests=$($testFiles.Count) pretty=$($prettyFiles.Count)" | Out-File -LiteralPath $summary -Append -Encoding utf8
$prettyFiles | Sort-Object | Out-File -LiteralPath (Join-Path $d "prettier-file-list.txt") -Encoding utf8

# A. BE ESLint 窄口径
Set-Location $root
$logA = Join-Path $d "patrol-eslint-be.log"
& $node "node_modules/eslint/bin/eslint.js" @beFiles --max-warnings 0 *> $logA
$codeA = $LASTEXITCODE
("ESLINT_BE_EXIT={0} bytes={1}" -f $codeA, (Get-Item -LiteralPath $logA).Length) | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Host ("ESLINT_BE_EXIT=" + $codeA)

# B. FE local ESLint（cwd=web，相对路径）
Set-Location (Join-Path $root "web")
$logB = Join-Path $d "patrol-eslint-fe-local.log"
& $node "node_modules/eslint/bin/eslint.js" "src/services/api/consultAgent.ts" "src/pages/consult-agent/ConsultAgentChatPage.tsx" --max-warnings 0 *> $logB
$codeB = $LASTEXITCODE
("ESLINT_FE_LOCAL_EXIT={0} bytes={1}" -f $codeB, (Get-Item -LiteralPath $logB).Length) | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Host ("ESLINT_FE_LOCAL_EXIT=" + $codeB)

# C. Prettier 57 文件全清单
Set-Location $root
$logC = Join-Path $d "patrol-prettier.log"
& $node "node_modules/prettier/bin/prettier.cjs" --check @prettyFiles *> $logC
$codeC = $LASTEXITCODE
("PRETTIER_EXIT={0} bytes={1}" -f $codeC, (Get-Item -LiteralPath $logC).Length) | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Host ("PRETTIER_EXIT=" + $codeC)

Set-Location $root
"=== recheck done $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Append -Encoding utf8
Get-Content -LiteralPath $summary

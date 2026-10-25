# consult 深化巡检 02:12 轮 · 静态门禁（顶层作用域直调，分段取进程退出码，不封装函数）
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
$d = Join-Path $root "reports\consult-deepen\patrol-20261026-0212"
New-Item -ItemType Directory -Force -Path $d | Out-Null
Set-Location $root
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$node = (Get-Command node).Source

$beRoute = "src/bff/routes/consultAgentRoutes.ts"
$beRepo  = "src/db/repositories/consultAgentRepo.ts"
$feService = "web/src/services/api/consultAgent.ts"
$fePage    = "web/src/pages/consult-agent/ConsultAgentChatPage.tsx"

$beCoreFiles = @()
Get-ChildItem -LiteralPath (Join-Path $root "src/core/agent/consult") -Recurse -Filter "*.ts" -File |
  ForEach-Object { $beCoreFiles += $_.FullName.Substring($root.Length + 1).Replace("\", "/") }

$testFiles = @()
foreach ($td in @("tests/unit/consult-agent", "tests/security/consult-agent", "tests/integration/consult-agent")) {
  Get-ChildItem -LiteralPath (Join-Path $root $td) -Recurse -Filter "*.test.ts" -File |
    ForEach-Object { $testFiles += $_.FullName.Substring($root.Length + 1).Replace("\", "/") }
}
$beFiles = @($beCoreFiles) + @($beRoute, $beRepo)
$prettyFiles = @($beCoreFiles) + @($beRoute, $beRepo, $feService, $fePage) + $testFiles

$summary = Join-Path $d "patrol-static-summary.log"
"=== static gate $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Encoding utf8
"beCoreFiles=$($beCoreFiles.Count) testFiles=$($testFiles.Count) prettyFiles=$($prettyFiles.Count)" | Out-File -LiteralPath $summary -Append -Encoding utf8

function Record($name, $code, $log) {
  $line = "{0}_EXIT={1} | log={2}" -f $name, $code, (Split-Path $log -Leaf)
  $line | Out-File -LiteralPath $summary -Append -Encoding utf8
  Write-Host $line
}

# 1. 根 tsc --noEmit
$log = Join-Path $d "patrol-tsc.log"
Set-Location $root
& $node "node_modules/typescript/lib/tsc.js" --noEmit *> $log
Record "TSC_ROOT" $LASTEXITCODE $log

# 2. 后端 consult ESLint 窄口径 --max-warnings 0
$log = Join-Path $d "patrol-eslint-be.log"
Set-Location $root
& $node "node_modules/eslint/bin/eslint.js" @beFiles --max-warnings 0 *> $log
Record "ESLINT_BE" $LASTEXITCODE $log

# 3a. 根口径 service 单文件
$log = Join-Path $d "patrol-eslint-fe-root-service.log"
Set-Location $root
& $node "node_modules/eslint/bin/eslint.js" $feService --max-warnings 0 *> $log
Record "ESLINT_FE_ROOT_SERVICE" $LASTEXITCODE $log

# 3b. 根口径 page 单文件
$log = Join-Path $d "patrol-eslint-fe-root-page.log"
Set-Location $root
& $node "node_modules/eslint/bin/eslint.js" $fePage --max-warnings 0 *> $log
Record "ESLINT_FE_ROOT_PAGE" $LASTEXITCODE $log

# 4. web 本地口径（cwd=web，相对路径）
$log = Join-Path $d "patrol-eslint-fe-local.log"
Set-Location (Join-Path $root "web")
& $node "node_modules/eslint/bin/eslint.js" "src/services/api/consultAgent.ts" "src/pages/consult-agent/ConsultAgentChatPage.tsx" --max-warnings 0 *> $log
Record "ESLINT_FE_LOCAL" $LASTEXITCODE $log

# 5. web 本地 tsc --noEmit
$log = Join-Path $d "patrol-tsc-web.log"
Set-Location (Join-Path $root "web")
& $node "node_modules/typescript/lib/tsc.js" --noEmit *> $log
Record "TSC_WEB" $LASTEXITCODE $log

# 6. Prettier --check 显式清单
$log = Join-Path $d "patrol-prettier.log"
Set-Location $root
& $node "node_modules/prettier/bin/prettier.cjs" --check @prettyFiles *> $log
Record "PRETTIER" $LASTEXITCODE $log

# 清单留档
$prettyFiles | Out-File -LiteralPath (Join-Path $d "prettier-file-list.txt") -Encoding utf8
Set-Location $root
"=== static done $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Append -Encoding utf8
Get-Content -LiteralPath $summary

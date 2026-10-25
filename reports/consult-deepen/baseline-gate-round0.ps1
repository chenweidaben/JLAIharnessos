# consult-agent 深化阶段 · 基线门禁脚本（round 0，深化前快照）
# 退出码为本脚本真实运行结果，不伪造；历史基线债务与 consult 新增分开记录。
# 注意：根配置 projectService 对 web 目录通配会崩溃，前端 ESLint 一律传具体文件路径。
$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root
$log = Join-Path $root "reports\consult-deepen"
New-Item -ItemType Directory -Force -Path $log | Out-Null
$env:DEMO_MODE = "1"
$env:PATH = "C:\Users\lenovo\.bun\bin;" + $env:PATH

$core = "src/core/agent/consult"
$beRoute = "src/bff/routes/consultAgentRoutes.ts"
$beRepo = "src/db/repositories/consultAgentRepo.ts"
$feService = "web/src/services/api/consultAgent.ts"
$fePage = "web/src/pages/consult-agent/ConsultAgentChatPage.tsx"
$testUnit = "tests/unit/consult-agent"
$testSec = "tests/security/consult-agent"
$testInt = "tests/integration/consult-agent"

$bePaths = @($core, $beRoute, $beRepo)
$prettierPaths = @($core, $beRoute, $beRepo, $feService, $fePage, $testUnit, $testSec, $testInt)

$summary = Join-Path $log "baseline-gate-round0.log"
"=== consult-agent deepen round0 baseline gate $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Encoding utf8

# 1. 根类型检查（全仓）
Set-Location $root
$out1 = Join-Path $log "baseline-tsc-round0.log"
& "node_modules\.bin\tsc.cmd" --noEmit *> $out1
$code1 = $LASTEXITCODE
"TSC_EXIT=$code1 | root tsc --noEmit" | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Output "TSC_EXIT=$code1"

# 2. 后端 consult ESLint（根配置，--max-warnings 0）
Set-Location $root
$out2 = Join-Path $log "baseline-eslint-be-round0.log"
& "node_modules\.bin\eslint.cmd" @bePaths --max-warnings 0 *> $out2
$code2 = $LASTEXITCODE
"ESLINT_BE_EXIT=$code2 | backend consult root eslint --max-warnings 0" | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Output "ESLINT_BE_EXIT=$code2"

# 3. 前端 consult ESLint（web 本地宽松配置，cwd=web，绝对路径文件，.cmd 绝对入口）
Set-Location (Join-Path $root "web")
$out3 = Join-Path $log "baseline-eslint-fe-local-round0.log"
$feSvcAbs = Join-Path $root "web/src/services/api/consultAgent.ts"
$fePageAbs = Join-Path $root "web/src/pages/consult-agent/ConsultAgentChatPage.tsx"
& (Join-Path $root "web/node_modules/.bin/eslint.cmd") $feSvcAbs $fePageAbs *> $out3
$code3 = $LASTEXITCODE
"ESLINT_FE_LOCAL_EXIT=$code3 | web local eslint consult (two files)" | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Output "ESLINT_FE_LOCAL_EXIT=$code3"

# 4a. 前端 service ESLint（根配置严格口径，cwd=root，单文件，绝对路径）
Set-Location $root
$out4a = Join-Path $log "baseline-eslint-fe-root-service-round0.log"
& node node_modules\eslint\bin\eslint.js $feService *> $out4a
$code4a = $LASTEXITCODE
"ESLINT_FE_ROOT_SERVICE_EXIT=$code4a | root strict eslint consultAgent.ts" | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Output "ESLINT_FE_ROOT_SERVICE_EXIT=$code4a"

# 4b. 前端 page ESLint（根配置严格口径，cwd=root，单文件；债务基线 7E/1W）
Set-Location $root
$out4b = Join-Path $log "baseline-eslint-fe-root-page-round0.log"
& node node_modules\eslint\bin\eslint.js $fePage *> $out4b
$code4b = $LASTEXITCODE
"ESLINT_FE_ROOT_PAGE_EXIT=$code4b | root strict eslint ConsultAgentChatPage.tsx (debt baseline)" | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Output "ESLINT_FE_ROOT_PAGE_EXIT=$code4b"

# 5. Prettier consult 全文件（传目录，prettier 不崩溃）
Set-Location $root
$out5 = Join-Path $log "baseline-prettier-round0.log"
& "node_modules\.bin\prettier.cmd" --check @prettierPaths *> $out5
$code5 = $LASTEXITCODE
"PRETTIER_EXIT=$code5 | prettier --check consult all files" | Out-File -LiteralPath $summary -Append -Encoding utf8
Write-Output "PRETTIER_EXIT=$code5"

Set-Location $root
"=== round0 gate done $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -LiteralPath $summary -Append -Encoding utf8
Get-Content -LiteralPath $summary

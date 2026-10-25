# ============================================================================
# consult-agent 深化专项一键门禁（round 1，可重复执行）
#
# 命令范式对齐仓库 package.json：
#   typecheck   -> 根 tsc --noEmit
#   lint:ci     -> 根 eslint --max-warnings 0（后端 consult 显式文件；前端两单文件分跑）
#   format:check -> prettier --check（consult 显式枚举文件清单）
#   test:unit   -> bun test consult 三目录
#
# 分段执行、分段退出码留痕；历史日志先按时间戳归档，不删除，gate-6 / gate-7
# 覆盖率与回归记录始终可追溯。
#
# 退出码纪律（01:11 巡检复核口径）：
#   - 进程退出码一律经 Start-Process -Wait -PassThru 的 $proc.ExitCode 获取，
#     不依赖函数作用域内 $LASTEXITCODE（函数 + *> + 非交互会话下不回刷新，会残留 -1）。
#   - tsc / eslint / prettier 走 node 直调 bin 脚本，不走 .cmd 包装器。
#   - 根配置 projectService 下前端 ESLint 必须 service / page 单文件分段；
#     两文件同跑会 OOM。
#   - ESLint / Prettier 一律传显式枚举文件清单，不传目录参数。
#   - 除进程 ExitCode 外，另用日志汇总行交叉佐证（tsc 零诊断、ESLint 无 error 行、
#     Prettier All matched files、bun 尾部 0 fail）；-1 标注为环境异常，不计代码失败。
# ============================================================================

$ErrorActionPreference = "Continue"
$root = "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
Set-Location $root

$logDir = Join-Path $root "reports\consult-deepen\round1-gate"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# 历史分段日志按时间戳归档，不删除；gate-6 bun-test / gate-7 coverage 一并归档留痕
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveDir = Join-Path $logDir ("archive\" + $stamp)
if (Get-ChildItem -LiteralPath $logDir -Filter "gate-*.log" -File -ErrorAction SilentlyContinue) {
  New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null
  Get-ChildItem -LiteralPath $logDir -Filter "gate-*.log" -File | Move-Item -Destination $archiveDir -Force
}

$env:DEMO_MODE = "1"
$env:PATH = "C:\Users\lenovo\.bun\bin;" + $env:PATH
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$bun = "C:\Users\lenovo\.bun\bin\bun.exe"
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe) { throw "node 未在 PATH 中解析到可执行文件" }

# ---- consult 范围清单（仅 consult 子系统，不越界到其他分片源码） -------------
$coreDir = "src/core/agent/consult"
$beRoute = "src/bff/routes/consultAgentRoutes.ts"
$beRepo = "src/db/repositories/consultAgentRepo.ts"
$feService = "web/src/services/api/consultAgent.ts"
$fePage = "web/src/pages/consult-agent/ConsultAgentChatPage.tsx"
$testUnit = "tests/unit/consult-agent"
$testSec = "tests/security/consult-agent"
$testInt = "tests/integration/consult-agent"

# 运行时枚举显式文件清单（ESLint / Prettier 均不接受目录参数）
$beCoreFiles = @()
Get-ChildItem -LiteralPath (Join-Path $root $coreDir) -Recurse -Filter "*.ts" -File |
  ForEach-Object {
    if ($_ -and $_.FullName) {
      $beCoreFiles += $_.FullName.Substring($root.Length + 1).Replace("\", "/")
    }
  }
if ($beCoreFiles.Count -eq 0) { throw "core 目录未枚举到任何 .ts 文件：$coreDir" }

# 测试目录枚举 *.ts：除 *.test.ts 外须纳入 unit/consult-agent/helpers.ts 等夹具，
# 使 Prettier 显式清单与巡检 57 文件口径一致（不传目录参数，避免 PS5.1 glob 不展开）。
$testFiles = @()
foreach ($d in @($testUnit, $testSec, $testInt)) {
  Get-ChildItem -LiteralPath (Join-Path $root $d) -Recurse -Filter "*.ts" -File |
    ForEach-Object {
      if ($_ -and $_.FullName) {
        $testFiles += $_.FullName.Substring($root.Length + 1).Replace("\", "/")
      }
    }
}

$beFiles = @($beCoreFiles) + @($beRoute, $beRepo)
$prettyFiles = @($beCoreFiles) + @($beRoute, $beRepo, $feService, $fePage) + $testFiles
$testDirs = @($testUnit, $testSec, $testInt)

$nodeTsc = "node_modules/typescript/lib/tsc.js"
$nodeEslint = "node_modules/eslint/bin/eslint.js"
$nodePrettier = "node_modules/prettier/bin/prettier.cjs"

$summary = Join-Path $logDir "gate-summary.log"
"=== consult-agent deepen round1 gate $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" |
  Out-File -LiteralPath $summary -Encoding utf8

$script:failures = 0
$script:anomalies = 0

# 日志交叉佐证：按段类型在 stdout / stderr 合并文本中查找失败特征行。
# 注意：bun 测试结果走 stderr；eslint 问题列小写 error；PowerShell -match 不区分大小写，
# 错误词匹配须用 -cmatch，避免误命中 NativeCommandError 等包装行。
function Confirm-SectionHealth {
  param([string]$Kind, [string]$OutLog, [string]$ErrLog)
  $out = ""
  $err = ""
  if (Test-Path -LiteralPath $OutLog) { $out = [IO.File]::ReadAllText($OutLog, [Text.Encoding]::UTF8) }
  if (Test-Path -LiteralPath $ErrLog) { $err = [IO.File]::ReadAllText($ErrLog, [Text.Encoding]::UTF8) }
  $all = $out + "`n" + $err
  switch ($Kind) {
    "tsc" {
      if ($out.Trim().Length -eq 0 -and $err.Trim().Length -eq 0) { return "ok" }
      return "warn: 存在 tsc 诊断输出"
    }
    "eslint" {
      $bad = ($all -split "`r?`n") |
        Where-Object { $_ -cmatch '\berror\b' -or $_ -cmatch '✖' -or $_ -cmatch 'problems?\s*$' }
      if ($bad.Count -eq 0) { return "ok" }
      return ("warn: 检出 " + $bad.Count + " 条 eslint 问题行")
    }
    "prettier" {
      if ($all -match "All matched files use Prettier code style!") { return "ok" }
      return "warn: prettier 未输出 All matched files 成功行"
    }
    "bun" {
      if ($all -match "(?m)^\s*(\d+)\s+fail") {
        $n = [int]$Matches[1]
        if ($n -eq 0) { return "ok" }
        return ("warn: bun 失败用例数=" + $n)
      }
      return "warn: bun 日志未检出 fail 汇总行"
    }
    default { return "n/a" }
  }
}

function Invoke-GateSection {
  param(
    [string]$Name,
    [string]$LogName,
    [string]$Cwd,
    [string]$Kind,
    [string]$FilePath,
    [string[]]$ArgList
  )
  $log = Join-Path $logDir $LogName
  $errLog = Join-Path $logDir ($LogName -replace "\.log$", "-err.log")
  $cmdLine = $FilePath + " " + ($ArgList -join " ")
  $startLine = "{0}_START {1} | {2}" -f $Name, (Get-Date -Format "HH:mm:ss"), $cmdLine
  $startLine | Out-File -LiteralPath $summary -Append -Encoding utf8
  Write-Host $startLine

  if (-not (Test-Path -LiteralPath $FilePath)) {
    $missLine = "{0}_ANOMALY=-1 | exe not found: {1}" -f $Name, $FilePath
    $missLine | Out-File -LiteralPath $summary -Append -Encoding utf8
    Write-Host $missLine
    $script:anomalies++
    return
  }

  $proc = Start-Process -FilePath $FilePath -ArgumentList $ArgList -WorkingDirectory $Cwd `
    -Wait -PassThru -NoNewWindow -RedirectStandardOutput $log -RedirectStandardError $errLog
  $code = $proc.ExitCode
  $health = Confirm-SectionHealth -Kind $Kind -OutLog $log -ErrLog $errLog

  if ($null -eq $code -or $code -eq -1) {
    $line = "{0}_ANOMALY=-1 | health={1} | {2}" -f $Name, $health, $cmdLine
    $line | Out-File -LiteralPath $summary -Append -Encoding utf8
    Write-Host $line
    $script:anomalies++
  } else {
    $line = "{0}_EXIT={1} | health={2} | {3}" -f $Name, $code, $health, $cmdLine
    $line | Out-File -LiteralPath $summary -Append -Encoding utf8
    Write-Host $line
    if ($code -ne 0 -or $health -like "warn*") { $script:failures++ }
  }
}

# 1. 根类型检查（全仓 tsc --noEmit；基线 §2 EXIT=0 口径）
Invoke-GateSection -Name "TSC_ROOT" -LogName "gate-1-tsc.log" -Cwd $root -Kind "tsc" `
  -FilePath $nodeExe -ArgList @($nodeTsc, "--noEmit")

# 2. 后端 consult ESLint（根配置 --max-warnings 0；显式文件：core 26 + 路由 + 仓储）
$beArgs = @($nodeEslint) + @($beFiles) + @("--max-warnings", "0")
Invoke-GateSection -Name "ESLINT_BE" -LogName "gate-2-eslint-be.log" -Cwd $root -Kind "eslint" `
  -FilePath $nodeExe -ArgList $beArgs

# 3a. 前端根口径严格 ESLint · service 单文件（禁止双文件同跑 projectService）
Invoke-GateSection -Name "ESLINT_FE_ROOT_SERVICE" -LogName "gate-3a-eslint-fe-root-service.log" `
  -Cwd $root -Kind "eslint" -FilePath $nodeExe -ArgList @($nodeEslint, $feService, "--max-warnings", "0")

# 3b. 前端根口径严格 ESLint · page 单文件
Invoke-GateSection -Name "ESLINT_FE_ROOT_PAGE" -LogName "gate-3b-eslint-fe-root-page.log" `
  -Cwd $root -Kind "eslint" -FilePath $nodeExe -ArgList @($nodeEslint, $fePage, "--max-warnings", "0")

# 4. 前端 web 本地口径（cwd=web，相对路径，web/eslint.config.js 非 type-checked）
$feLocalArgs = @("node_modules/eslint/bin/eslint.js", "src/services/api/consultAgent.ts", "src/pages/consult-agent/ConsultAgentChatPage.tsx")
Invoke-GateSection -Name "ESLINT_FE_LOCAL" -LogName "gate-4-eslint-fe-local.log" `
  -Cwd (Join-Path $root "web") -Kind "eslint" -FilePath $nodeExe -ArgList $feLocalArgs

# 5. Prettier consult 全文件（显式枚举清单；prettier 不解析 projectService）
$prettierArgs = @($nodePrettier, "--check") + $prettyFiles
Invoke-GateSection -Name "PRETTIER" -LogName "gate-5-prettier.log" -Cwd $root -Kind "prettier" `
  -FilePath $nodeExe -ArgList $prettierArgs

# 6. consult 三目录 bun 测试（DEMO_MODE=1，进程内仓储，不连库不联网）
$testArgs = @("test") + $testDirs
Invoke-GateSection -Name "BUN_TEST" -LogName "gate-6-bun-test.log" -Cwd $root -Kind "bun" `
  -FilePath $bun -ArgList $testArgs

# 7. 覆盖率实测报告段（bun --coverage --coverage-reporter text；数字以日志实测为准）
$coverageArgs = @("test", "--coverage", "--coverage-reporter", "text") + $testDirs
Invoke-GateSection -Name "COVERAGE" -LogName "gate-7-coverage.log" -Cwd $root -Kind "bun" `
  -FilePath $bun -ArgList $coverageArgs

Set-Location $root
"=== gate done $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | FAILURE_SECTIONS=$script:failures ANOMALY_SECTIONS=$script:anomalies ===" |
  Out-File -LiteralPath $summary -Append -Encoding utf8
Get-Content -LiteralPath $summary

if ($script:failures -gt 0) { exit 1 }
exit 0

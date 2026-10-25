# consult-agent M86 运行与排障手册（Runbook）

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 本手册面向 consult-agent 多角色问诊子系统的本地开发、门禁执行与故障排查；命令以仓库根 `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`、分支 `consult-agent-m86`、Windows PowerShell 5.1 为准。本文不替代 [06-test-strategy.md](./06-test-strategy.md) 的测试分层说明，覆盖率数字口径见 [11-test-coverage-matrix.md](./11-test-coverage-matrix.md)。

## 1. 适用范围与前置条件

### 1.1 环境基线

| 项 | 口径 | 证据 |
|---|---|---|
| 操作系统 | Windows（PowerShell 5.1，Bash 禁用；读 UTF-8 文档用 `[IO.File]::ReadAllText($path,[Text.Encoding]::UTF8)`，路径用 `-LiteralPath`） | 任务边界与本机环境 |
| 仓库根 | `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86` | `scripts/consult-agent/gate.ps1` 25 行 `$root` |
| Node | ≥ 18；`gate.ps1` 经 `Get-Command node` 解析可执行文件，缺失即抛错（43–44 行） | 根 `package.json` `engines.node`；`gate.ps1` 43–44 |
| Bun | 绝对路径 `C:\Users\lenovo\.bun\bin\bun.exe`，未入 PATH 时由脚本 40 行前置到 PATH；覆盖率日志版本 `bun test v1.2.0 (b0c5a765)` | `gate.ps1` 40、42；`reports/consult-deepen/coverage-round1.md` §1.1 |
| 真实 PostgreSQL | **非前置**：本机不要求运行中数据库；DEMO 模式走进程内仓储 | `coverage-round1.md` §6 第 1 条 |
| LLM 凭证 | **非前置**：当前实现不联网，无凭证或有凭证均走离线确定性模板 | `src/core/agent/consult/llm/safeLlm.ts` 7、47–55 |
| 真实 SSE 服务 | **非前置**：本地测试由 fake `Ctx` 驱动，不做真实 HTTP 端到端联调 | `coverage-round1.md` §6 第 3 条 |

### 1.2 命令执行约定

- 除前端 `ESLINT_FE_LOCAL` 段（`gate.ps1` 189–192 行，`cwd=web`）与 web 独立类型检查外，所有命令在**仓库根**执行。
- 本手册记录的门禁 / 测试命令由其他环节执行；文档撰写环节不运行 bun 测试、覆盖率、构建、eslint 与 prettier（任务边界要求）。
- 读取既有报告与日志时显式使用 UTF-8 解码，避免 PowerShell 默认 ANSI 造成中文乱码。

## 2. 环境变量

| 变量 | 默认 / 取值 | 用途与口径 | 证据位置 |
|---|---|---|---|
| `DEMO_MODE` | 门禁内置为 `1`（`gate.ps1` 39 行 `$env:DEMO_MODE = "1"`） | 后端仓储短路：`1` / `true` 时返回 `DemoConsultRepo` + 进程内 `SessionRuntime` 单例，不连库；其他值走 `PostgresConsultRepo` 非 DEMO 路径（本机不执行） | `src/db/repositories/consultAgentRepo.ts` 31–33、408–413；`src/core/agent/consult/runtime/sessionRuntime.ts` 27–29 |
| `ANTHROPIC_API_KEY` | 可选，默认未配置 | 凭证探测键之一；当前实现不发起网络请求，`isAvailable` 仅判断是否非空，`complete` 恒返回离线模板与 `degraded=true` | `llm/safeLlm.ts` 22（三个凭证键）、43–45（`isAvailable`）、47–55（`complete`，53 行 `degraded: true`）、59（`createSafeLlm`） |
| `OPENAI_API_KEY` | 可选，默认未配置 | 同上，凭证探测键 | `llm/safeLlm.ts` 22 |
| `DEEPSEEK_API_KEY` | 可选，默认未配置 | 同上，凭证探测键 | `llm/safeLlm.ts` 22 |
| `VITE_API_BASE_URL` | 默认 `/api/v1` | 前端 Axios `baseURL`；服务层相对路径 `/consult-agent/...` 在此基础上拼接 | `web/src/utils/config.ts` 9；`web/src/services/request.ts` 67 |
| `VITE_API_TIMEOUT_MS` | 默认 `30000`（毫秒） | Axios 请求超时；SSE 流由 `consumeSseStream` 直接 `fetch`，不经 Axios 超时拦截器 | `request.ts` 32–33 |
| `VITE_DEMO_MODE` / `VITE_MOCK_ENABLED` | 默认关 | 前端演示开关，与后端 `DEMO_MODE` 相互独立，仅控制前端演示提示口径 | `web/src/utils/config.ts` 12–15 |
| `NODE_OPTIONS` | 门禁内置 `--max-old-space-size=8192` | ESLint / TypeScript 大文件堆内存上限，避免 OOM；手工复跑 lint 段时须同样设置 | `gate.ps1` 41 |
| `PATH` | 门禁前置 `C:\Users\lenovo\.bun\bin` | 让 bun 可解析；脚本 40 行仅在进程内前置，不修改系统环境变量 | `gate.ps1` 40 |

## 3. 依赖安装

1. **后端依赖**：仓库根执行 `bun install`（`packageManager: bun@1.4.2`；`engines.bun >=1.3.0`、`node >=18`）。`node_modules/typescript/lib/tsc.js`、`node_modules/eslint/bin/eslint.js`、`node_modules/prettier/bin/prettier.cjs` 为门禁脚本直调的 bin 路径（`gate.ps1` 82–84），不经过 `.cmd` 包装器（脚本 16 行注释）。
2. **前端依赖**：进入 `web/` 目录执行 `bun install`（或 `npm install`）；前端构建脚本见 `web/package.json`：`dev = vite`、`build = tsc --noEmit && vite build`、`typecheck = tsc --noEmit`。
3. **不需要执行**：数据库迁移、种子导入、在线 LLM SDK 联网配置；非 DEMO 仓储路径在本机仅保证编译通过（`consultAgentRepo.ts` 12 行注释口径）。

## 4. consult 目录结构速览

### 4.1 核心包 `src/core/agent/consult/`（26 个 `.ts` 文件）

| 子目录 / 文件 | 职责 | 代表行号证据 |
|---|---|---|
| `consultOrchestrator.ts` | 编排器主流程：归属 / 终态校验、急症旁路、退出意图、角色装配与分派、哨兵审批、记忆合并、事件与消息落库 | `consultOrchestrator.ts` 124–396 |
| `types.ts` | 枚举、实体接口、zod schema、安全常量、SSE 联合类型（单一事实来源） | `types.ts` 126–145、194–243、250–255、261–277 |
| `stateMachine.ts` | 状态转移表、`canTransition`、`assertTransition`、终态判定 | `stateMachine.ts` 13–39 |
| `intentClassifier.ts` | 意图分类、急症短路、追问上下文兜底 | `intentClassifier.ts` 91–121 |
| `supervisor.ts` | 充分度判定与下游角色路由 | `supervisor.ts` 24–57 |
| `roleSupport.ts` | ID / 时间戳、免责声明拼接、证据构造、展示名、置信度分级、文本归一 | `roleSupport.ts` 16–72 |
| `ports.ts` | `ConsultAgentPort`、`RoleInput`、`RoleOutput`、`RolePort` 契约 | 核心包端口契约 |
| `audit/index.ts` | 审计条目构造、`detail` 递归脱敏、工具调用记录构造 | `audit/index.ts` 18–97 |
| `llm/safeLlm.ts` | 安全降级 LLM 端口与离线确定性实现 | `llm/safeLlm.ts` 14–61 |
| `memory/profileMemory.ts` | 长期画像事实合并、单事实 upsert、文本抽取 | `memory/profileMemory.ts` 39–140 |
| `memory/shortTermMemory.ts` | 短期滑窗消息、检查点 | `memory/shortTermMemory.ts`（`index.ts` 81 行导出） |
| `roles/` | `supervisorRole` / `examinerRole` / `doctorRole` / `pharmacistRole` / `internal` / `index` 注册表 | `roles/index.ts` 18–33；角色实现 35 / 49 / 47 / 68 行类定义 |
| `runtime/sessionRuntime.ts` | DEMO 进程内会话运行时（`SessionRuntime` + `createDemoRuntime`） | `runtime/sessionRuntime.ts` 27–29、41、182–184 |
| `safety/acuteVocabulary.ts` | 急症词表与命中检测 | `safety/acuteVocabulary.ts` 11、70–81 |
| `safety/safetyGate.ts` | acute / caution / normal 三档安全评估 | `safety/safetyGate.ts` 40–58 |
| `sentinel/sentinelGateway.ts` | 草稿三红线 / 证据 / 急症 / 重复哈希审批闸 | `sentinel/sentinelGateway.ts` 35–75 |
| `tools/toolRegistry.ts` | 工具注册表、参数归一化与白名单过滤、五个内置工具 | `tools/toolRegistry.ts` 184–312 |
| `tools/evidenceExtractor.ts` | 工具名 → 证据类别映射、证据条目构造 | `tools/evidenceExtractor.ts` 28–54 |
| `demo/demoSeed.ts` | DEMO 引导文案、角色指引、示例知识 / 药品事实、规则快照种子 | `demo/demoSeed.ts` 15–127 |
| `draftHash.ts` | 草稿稳定字段提取与 SHA-256 哈希 | `draftHash.ts` 17–90 |
| `index.ts` | 核心包聚合导出 | `index.ts` 11–123 |

### 4.2 BFF、仓储、前端与测试落点

| 层 | 路径 |
|---|---|
| BFF 路由 | `src/bff/routes/consultAgentRoutes.ts`（12 个 handler，模块级仓储实例 45 行） |
| 仓储 | `src/db/repositories/consultAgentRepo.ts`（DEMO / Postgres 双实现 + 工厂） |
| 权限登记 | `src/bff/permissions.ts` 207–218 |
| 前端服务层 | `web/src/services/api/consultAgent.ts`（12 个服务函数 + `consumeSseStream`） |
| 前端页面 | `web/src/pages/consult-agent/ConsultAgentChatPage.tsx` |
| 单元测试 | `tests/unit/consult-agent/`（23 个 `.test.ts` + `helpers.ts` 夹具） |
| 安全测试 | `tests/security/consult-agent/permissions.test.ts` |
| 集成测试 | `tests/integration/consult-agent/consultFlow.test.ts`、`consultRouteErrors.test.ts` |
| OpenAPI | `docs/api/consult-agent-openapi.yaml` |
| 门禁脚本 | `scripts/consult-agent/gate.ps1` |
| 覆盖率报告 | `reports/consult-deepen/coverage-round1.md`；基线档案 `reports/consult-deepen/baseline-round0.md` |

## 5. 一键门禁

### 5.1 执行命令（仓库根）

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/consult-agent/gate.ps1
```

- 脚本自动切换工作目录到 `$root`（`gate.ps1` 26 行 `Set-Location $root`）。
- 脚本自动设置 `DEMO_MODE=1`（39 行）、前置 bun 到 PATH（40 行）、设置 `NODE_OPTIONS=--max-old-space-size=8192`（41 行）。
- 八段顺序固定（1 根 tsc、2 后端 ESLint、3a 前端 service、3b 前端 page、4 前端本地 ESLint、5 Prettier、6 bun 三目录测试、7 覆盖率），逐段执行、逐段退出码留痕；`gate.ps1` 212 行输出汇总、214–215 行：`$script:failures -gt 0` 时退出码 1，否则退出码 0。2026-10-26 02:26:53 复跑：八段 `EXIT=0`、`FAILURE_SECTIONS=0`、`ANOMALY_SECTIONS=0`（汇总日志末行）。

### 5.2 分段日志名与健康判定

| 段序 | 段名（脚本内部） | 日志名 | 健康判定口径（`Confirm-SectionHealth` 96–128 行） |
|---|---|---|---|
| 1 | `TSC_ROOT` | `gate-1-tsc.log`（stderr：`gate-1-tsc-err.log`） | `tsc`：stdout / stderr 均为空即 `ok`；存在诊断输出为 `warn`（104–106 行） |
| 2 | `ESLINT_BE` | `gate-2-eslint-be.log` / `-err.log` | `eslint`：合并文本无 `error` / `✖` / `problems` 行即 `ok`；否则按问题行数 `warn`（108–113 行） |
| 3a | `ESLINT_FE_ROOT_SERVICE` | `gate-3a-eslint-fe-root-service.log` / `-err.log` | 同 `eslint` 口径；service 单文件 |
| 3b | `ESLINT_FE_ROOT_PAGE` | `gate-3b-eslint-fe-root-page.log` / `-err.log` | 同 `eslint` 口径；page 单文件 |
| 4 | `ESLINT_FE_LOCAL` | `gate-4-eslint-fe-local.log` / `-err.log` | 同 `eslint` 口径；`cwd=web`，非 type-checked 本地配置 |
| 5 | `PRETTIER` | `gate-5-prettier.log` / `-err.log` | 命中 `All matched files use Prettier code style!` 即 `ok`（114–116 行） |
| 6 | `BUN_TEST` | `gate-6-bun-test.log` / `-err.log` | `bun`：尾部汇总 `fail` 数为 0 即 `ok`；未检出 fail 汇总行为 `warn`（118–125 行） |
| 7 | `COVERAGE` | `gate-7-coverage.log` / `-err.log` | 同 `bun` 口径；覆盖率数字以日志实测为准（204–207 行注释） |

- 退出码纪律：进程退出码一律经 `Start-Process -Wait -PassThru` 的 `$proc.ExitCode` 获取（154–155 行），不依赖函数作用域内 `$LASTEXITCODE`；退出码 `null` 或 `-1` 记为 `ANOMALY=-1` 环境异常（159–161 行），不计代码失败；非 0 退出码或健康判定 `warn` 累计进 `$script:failures`（168 行）。
- 汇总日志：`reports/consult-deepen/round1-gate/gate-summary.log`（2026-10-26 02:26:53 复跑快照 19 行；`gate.ps1` 86 行为 `$summary` 路径定义行），逐段写入 `xxx_START` / `xxx_EXIT=` / `xxx_ANOMALY=-1` 行（143、147、160、165 行）。

### 5.3 归档规则

- 日志目录：`reports/consult-deepen/round1-gate/`（28 行 `$logDir`）。
- 启动归档：脚本启动时若 `$logDir` 下存在 `gate-*.log`，先按 `yyyyMMdd-HHmmss` 时间戳创建 `archive/<时间戳>/`，把既有 `gate-*.log` 全部移入，**只归档不删除**（31–37 行）。
- 报告落档口径（`coverage-round1.md` §1.2 第 29 行）：覆盖率报告落档时 `round1-gate/` 目录下无门禁分段落档文件，本轮覆盖率与功能测试数字取自 `reports/consult-deepen/patrol-20261026-0019/` persisted 巡检日志；后续执行 `gate.ps1` 产生的 `gate-*.log` 按上文归档规则在该目录留存与归档。

## 6. 分段命令清单（可单独复跑，供排障定位）

> 以下命令为手册记录；正式执行由门禁脚本统一装配环境变量与文件清单。复跑前先在仓库根设置 `$env:DEMO_MODE="1"` 与 `$env:NODE_OPTIONS="--max-old-space-size=8192"`。

| 段 | 工作目录 | 命令（node 直调 bin，不经 `.cmd`） | 文件清单口径 |
|---|---|---|---|
| 1 类型检查 | 仓库根 | `node node_modules/typescript/lib/tsc.js --noEmit` | 全仓根 `tsconfig`，非 consult 子集（`gate.ps1` 173–174） |
| 2 后端 ESLint | 仓库根 | `node node_modules/eslint/bin/eslint.js <core 26 个 .ts> src/bff/routes/consultAgentRoutes.ts src/db/repositories/consultAgentRepo.ts --max-warnings 0` | `$beFiles = $beCoreFiles + @($beRoute, $beRepo)`（78 行）；core 由 57–63 行递归枚举、64 行空清单抛错 |
| 3a 前端 service（根口径） | 仓库根 | `node node_modules/eslint/bin/eslint.js web/src/services/api/consultAgent.ts --max-warnings 0` | 单文件，禁止与 page 同跑（182–183 行） |
| 3b 前端 page（根口径） | 仓库根 | `node node_modules/eslint/bin/eslint.js web/src/pages/consult-agent/ConsultAgentChatPage.tsx --max-warnings 0` | 单文件（186–187 行） |
| 4 前端本地口径 | `web/` | `node node_modules/eslint/bin/eslint.js src/services/api/consultAgent.ts src/pages/consult-agent/ConsultAgentChatPage.tsx` | `web/eslint.config.js` 非 type-checked（189–192 行） |
| 5 Prettier | 仓库根 | `node node_modules/prettier/bin/prettier.cjs --check <$prettyFiles>` | `$prettyFiles`：core 26 + 路由 + 仓储 + 前端 service + 前端 page + 三目录测试 `.test.ts`（79 行）；不传目录参数（194–197 行） |
| 6 单元 / 安全 / 集成测试 | 仓库根 | `C:\Users\lenovo\.bun\bin\bun.exe test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent` | 三目录（80 行 `$testDirs`、199–202 行 `BUN_TEST` 段） |
| 7 覆盖率 | 仓库根 | `C:\Users\lenovo\.bun\bin\bun.exe` test --coverage --coverage-reporter text tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent | 三目录（204–207 行 `COVERAGE` 段） |

## 7. 单独跑测试与覆盖率命令

bun 未入 PATH，一律使用绝对路径 `C:\Users\lenovo\.bun\bin\bun.exe`（`gate.ps1` 42 行）。执行前：

```powershell
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
```

### 7.1 三目录分别执行

```powershell
# 单元测试
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent

# 安全测试（权限码门禁）
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/security/consult-agent

# 集成测试（E2E 主链路 + 路由错误分支）
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/integration/consult-agent
```

### 7.2 三目录合计执行

```powershell
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent
```

### 7.3 覆盖率实测

```powershell
& "C:\Users\lenovo\.bun\bin\bun.exe" test --coverage --coverage-reporter text tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent
```

- reporter 仅输出 `% Funcs`、`% Lines`、`Uncovered Line #s` 三列，**不提供 statements / branches 独立百分比**；覆盖率数字以落档日志实测为准，不现场估算（`coverage-round1.md` §1.1、§2）。
- 本轮基线对照：326 pass / 0 fail / 2090 expect / 26 文件，All files 88.81% Funcs、91.20% Lines（`coverage-round1.md` §1.3、§2；详见 [11-test-coverage-matrix.md](./11-test-coverage-matrix.md) §1）。

### 7.4 前端独立类型检查兜底

```powershell
cd web
node node_modules/typescript/lib/tsc.js --noEmit
```

- 对应 `web/package.json` `typecheck = tsc --noEmit`；根 `gate-1-tsc.log` 为全仓口径，前端本地 `tsc` 用于独立复核 `web/src` 类型。

## 8. 症状 → 诊断 → 处置 排查表

| # | 症状 | 诊断要点 | 处置步骤 | 证据位置 |
|---|---|---|---|---|
| 1 | ESLint 进程 OOM、崩溃、退出码 `-1` | 根配置 `projectService` 下前端 service 与 page 双文件同跑，或堆内存不足；脚本 159–161 行将 `-1` 标为环境异常 | 确认 `NODE_OPTIONS=--max-old-space-size=8192` 已设置（门禁 41 行自动装配）；3a / 3b 必须拆单文件分段执行；不把两文件并入同一 eslint 进程 | `gate.ps1` 17–18、41、181–187、159–161 |
| 2 | 根配置 projectService 传目录参数后退化为全仓扫描，耗时暴涨 | ESLint / Prettier 接受目录参数时在根配置下解析全仓项目，超出 consult 文件清单 | 一律传显式枚举文件清单，禁止目录参数；后端 core 由 `$beCoreFiles` 递归枚举后并入 `$beFiles`，测试文件并入 `$prettyFiles` | `gate.ps1` 19、56–79、194–197 |
| 3 | `gate-5-prettier.log` 未输出 `All matched files use Prettier code style!` | 个别 consult 文件格式不符合 Prettier 规则 | 对报错单文件执行 `node node_modules/prettier/bin/prettier.cjs --write <相对路径>`，保存后复跑 `gate-5`；不要对全仓执行 `--write` | `gate.ps1` 114–116、194–197；根 `package.json` `format` 脚本口径 |
| 4 | 接口返回 401，或业务码 `UNAUTHORIZED` / `TOKEN_EXPIRED` | 未携带有效 Bearer token；`requireAuth` 全局拦截；权限中间件 `c.user` 为空 | 前端 `request.ts` 105、124 行清除本地 token 并跳转登录；重新登录后重试；SSE 场景 401 由 `consumeSseStream` 走 `onError('HTTP_ERROR', …)` 上报（501–507 行） | `src/bff/server.ts` 6805–6808；`src/bff/middleware/auth.ts` 315–316；`request.ts` 103–107、123–127；`consultAgent.ts` 501–507 |
| 5 | 接口返回 403「权限不足：需要 consult-agent:<code>」（`auth.ts` 323 模板为 `权限不足：需要 ${code}`，code 为实际缺失的权限码） | JWT `permissions` 数组缺对应权限码；非 admin 且未命中显式码 / 分组通配 | 对照 [09-permission-matrix.md](./09-permission-matrix.md) §2 角色映射核对登录签发权限；admin 直通；前端无权限入口本应不渲染（§4.1），不得通过前端改权限绕过，服务端为权威闸 | `auth.ts` 318–324；`consultAgentRoutes.ts` 各 handler 首行 `requirePermissionCode`（179、239、252、296、313、340、357、382、417、515、540、553） |
| 6 | 接口返回 404「咨询会话不存在」 | `threadId` 不属于当前登录用户，或线程不存在；归属隔离统一返回 404，不区分两种情形 | 刷新会话列表确认当前 `currentId`；核对请求路径 `:threadId` 与当前用户；不要在 404 响应中推断线程是否存在 | `consultAgentRoutes.ts` 106–112（`findOwnedThread`）；`consultOrchestrator.ts` 129–131；错误映射 96–97、109 |
| 7 | 接口返回 409「咨询会话已结束或已关闭」 | 对 `closed` / `aborted` 终态会话发消息、转写或重复退出 | 新建会话继续问诊；前端终态禁用退出按钮（817）、转写按钮（1128）、输入框（1146）、发送按钮（1153）；重复退出属幂等端点但服务端前置终态守卫 | `consultOrchestrator.ts` 133–135；`consultAgentRoutes.ts` 560–561；错误映射 99–100；`stateMachine.ts` 37–39 |
| 8 | 接口返回 500「咨询处理失败，请稍后重试」 | 编排器抛出未归类异常；`mapConsultError` 兜底为 500，响应体不含堆栈与内部状态 | 以响应体 `traceId` 检索服务端日志与审计条目；不得向前端回显错误类名、堆栈、内部状态；区分 404 / 409 / 500 三类映射后定位编排分支 | `consultAgentRoutes.ts` 93–103（`mapConsultError`：96–97 404、99–100 409、102 500 不回显堆栈） |
| 9 | SSE 流中途无收尾帧，前端空气泡不消失 | 结束帧 `data: [DONE]\n\n` 未到达；响应头被中间层缓冲；真实断流未被前端识别 | 核对 `SSE_HEADERS` 四个响应头（禁止缓冲、`X-Accel-Buffering: no`）；确认代理未关闭缓冲；abort / cancel 回调需真实 HTTP 联调验证（本机 fake Request 不可达，见 [11-test-coverage-matrix.md](./11-test-coverage-matrix.md) §5 §4.1） | `consultAgentRoutes.ts` 48–53、115–129（127 行结束帧）、132–166（150–158 abort、160–163 cancel）；`consultAgent.ts` 413（跳过 `[DONE]`）、510–531 |
| 10 | 重启 BFF 后会话、消息、草稿、审计全部清空 | DEMO_MODE 走进程内 `SessionRuntime` Map，不连库；重启即丢失 | 演示前重新创建会话并走完问诊流程；非 DEMO 模式须配置 PostgreSQL 与连接池，本机该路径未闭环（§9） | `consultAgentRepo.ts` 31–33、408–413；`sessionRuntime.ts` 27–29、41；`coverage-round1.md` §6 第 1 条 |
| 11 | 审计抽屉 / 审计条目出现工具原始入参明文 | `detail` 新增键名未被脱敏模式覆盖；工具记录被塞入原始参数 | 核对 `RAW_ARG_KEY_PATTERN` 是否覆盖新键名；`createToolCallRecord` 结构上不存在原始入参槽位；前端抽屉标题固定「仅脱敏摘要，不回显原始入参」 | `audit/index.ts` 14、18–33、36–44、61–76（73 行 `redactRawArgs`）、79–97；`ConsultAgentChatPage.tsx` 1211–1213 |
| 12 | 草稿疑似脱离复核口径（可签发、院外处方） | 草稿三红线字面量或哨兵校验被绕过 | 核对草稿恒为 `needsPhysicianReview=true`、`isOutOfHospitalPrescription=false`、`status='pending_review'`；zod 字面量 + 哨兵双闸；驳回事件 `DRAFT_REJECTED` 落 `sentinel_rejected` 审计；前端三标签由字段驱动：254「需执业医师复核」、256「非院外处方」、296「AI 辅助建议，待医师复核」，不允许本地改写 | `types.ts` 135、137、138、234–236；`sentinelGateway.ts` 43–44、46–47、49–53；`consultOrchestrator.ts` 289、291–307；`ConsultAgentChatPage.tsx` 254、256、296 |
| 13 | 重复提交产生重复会话 / 消息 / 草稿 | 写端点幂等键由全局中间件装配；网络重试场景下重复请求需中间件幂等保护 | 确认写端点（创建、发消息、转写、退出）携带 `Idempotency-Key`；流式端点不消费幂等键；前端 POST 不自动重试（仅 GET 参与指数退避） | `src/bff/server.ts` 6822–6823（`withIdempotency`）；`consultAgentRoutes.ts` 377（stream 注释）；`docs/api/consult-agent-openapi.yaml` 82、134、190、272、386；`request.ts` 129–136 |
| 14 | 状态变更请求被 CSRF 校验拒绝（403） | 缺少 / 失效 `X-CSRF-Token`，与 `csrf-token` Cookie 不一致；双重提交校验在全局管道前置 | 刷新页面重新获取 CSRF Cookie；核对前端请求头注入；GET / HEAD / OPTIONS 服务端不校验，状态变更才校验 | `src/bff/server.ts` 6782–6785（`verifyCsrf`）；`request.ts` 83–88；`consultAgent.ts` 479–480、486–492 |
| 15 | 排障无法串联一次问诊的消息、草稿、审计与工具调用 | 响应信封与审计条目携带 `traceId`，需用同一 traceId 串联 | 从响应信封或浏览器网络面板取 `traceId`；检索 BFF 请求日志与 `audit_trail` 条目 `traceId` 字段；前端 SSE 错误事件 `code` / `message` 附带来源状态码 | `consultAgentRoutes.ts` 85、97、100、102、109、185、209、224、242、259、281、303、323、330、347（`c.traceId` 贯穿 `ok` / `fail` 信封）；`consultAgent.ts` 461–463（`error` 事件 code / message） |
| 16 | 根 `tsc --noEmit` 通过但前端存在独立类型错误 | 根类型检查与 `web/` 本地 tsconfig 口径不同 | 进入 `web/` 单独执行 `node node_modules/typescript/lib/tsc.js --noEmit` 复核；修复后复跑门禁 3a / 3b / 4 段 | `web/package.json` `typecheck = tsc --noEmit`；`gate.ps1` 173–174、177–192 |

### 8.1 医疗红线现场核对清单（不得弱化）

排障与评审时逐条核对，任一项不满足即视为红线缺陷，按 §8 对应症状升级处置：

| 红线项 | 强制口径 | 证据位置 |
|---|---|---|
| 急症旁路 | 命中 `acute` 即转 `escalated`；旁路**不进角色编排、不产草稿、不调工具**；仅下发 `safety:acute` + `disclaimer` + `done` 三事件，落 `acute_bypass` 审计 | `consultOrchestrator.ts` 138（入口先判安全）、141–179（旁路整段：142 转 `escalated`、148–153 审计、169–173 三事件、179 返回 `draft: null`）；`safety/safetyGate.ts` 40–57；`safety/acuteVocabulary.ts` 70–81 |
| 草稿三红线 | `needsPhysicianReview=true`、`isOutOfHospitalPrescription=false`、`status='pending_review'`；zod 字面量 + 哨兵审批双闸；驳回落 `sentinel_rejected` 审计并下发 `error: DRAFT_REJECTED` | `types.ts` 135、137、138、234–236；`sentinel/sentinelGateway.ts` 43–44、46–47、49–53；`consultOrchestrator.ts` 289、291–307 |
| 草稿标签 | 「需执业医师复核」「非院外处方」「AI 辅助建议，待医师复核」由草稿字段驱动，不允许本地改写 | `ConsultAgentChatPage.tsx` 254、256、296 |
| 审计脱敏 | 仅留脱敏摘要，不回显原始入参；工具调用记录结构上不存在原始入参槽位 | `audit/index.ts` 14、18–33、36–44、61–76（73 行 `redactRawArgs`）、79–97；抽屉标题 `ConsultAgentChatPage.tsx` 1211–1213 |
| 离线引导 | 无 LLM 凭证（或有凭证）均走确定性离线模板，`degraded=true`；不联网、不产生临床结论 | `llm/safeLlm.ts` 22、43–45、47–55（53 行 `degraded: true`）；`consultAgentRoutes.ts` 77–91 |
| 免责声明与 120 常驻 | 免责声明常驻页面底部，每条 assistant 回复下方附免责声明；120 急症提示常驻 | `ConsultAgentChatPage.tsx` 83–84（`DISCLAIMER` 常量）、1110（每条回复下方）、1162–1173（页面底部常驻）、973（120 提醒）、87–88（`ACUTE_GUIDANCE`） |

## 9. 环境硬约束清单（本机未闭环，排障时不得视为已验证）

以下约束与 `reports/consult-deepen/coverage-round1.md` §6 逐字对齐，手册结论仅在该约束下成立：

1. **真实数据库未演练**：本机无运行中 PostgreSQL；迁移 `380`–`385` 六表（`consult.threads`、`consult.messages`、`consult.documents`、`consult.diagnosis_prescription_drafts`、`consult.audit_trail`、`consult.profile_memory`）的真实建表、真实连接与 SQL 执行未演练；`PostgresConsultRepo` 仅经 mock pool 契约测试，不代表真实库表连通。
2. **在线 LLM 路径未演练**：环境内无三个凭证变量；`safeLlm` 仅覆盖离线确定性降级路径，在线模型请求、响应解析、超时与重试链路未演练。
3. **真实 SSE / HTTP 联调未演练**：未启动真实 HTTP 服务做端到端联调；中途断流、断线重连、超时降级、token 计量与节流均未覆盖；`consultAgentRoutes.ts` 150–158、160–163 两条断流回调需在该阶段补覆盖。
4. **浏览器视觉走查未执行**：本轮结论不含前端页面渲染、交互走查与视觉回归；按钮显隐、抽屉布局、草稿标签、置信度颜色需在浏览器人工复核。
5. **覆盖范围边界**：门禁测试仅反映 `tests/unit/consult-agent`、`tests/security/consult-agent`、`tests/integration/consult-agent` 三目录在 DEMO 进程内仓储下的执行情况；`web/` 与其他 B 类后端模块不在本分片口径内。
6. **基线遗留失败用例不计入本轮统计**：`tests/unit/onlineConsult.test.ts`（F1，日期硬编码 1 fail）、`tests/unit/db/ddl.test.ts`（F2，check-sql 误报 1 fail）不在 consult 三目录内，本轮未修复、不计入本轮 pass / fail 与覆盖率口径。

### 9.1 归属其他分片的边界文件

排障时遇到下列文件不要归入 consult 责任范围，按对应分片工单流转：`src/db/pool.ts`、`src/security/encryption/FieldCipher.ts`、`src/bff/routes/health.ts`、`src/bff/routes/imaging.ts`、`src/bff/routes/twin3DInpatient.ts`、`web/src/router/index.tsx`、`src/bff/server.ts`、`src/bff/config/runtimeEnv.ts`、`src/bff/middleware/auth.ts`、`src/db/repositories/helpers.ts`；`services-java`（Maven / JVM）与 `services-python`（radar-inference）不在本机验证范围。

## 10. 日志归档位置与回滚 / 清理步骤

### 10.1 日志位置

| 类别 | 路径 |
|---|---|
| 当期门禁日志 | `reports/consult-deepen/round1-gate/gate-1-tsc.log` … `gate-7-coverage.log`，配套 `gate-*-err.log` |
| 门禁汇总 | `reports/consult-deepen/round1-gate/gate-summary.log`（`gate.ps1` 86 行） |
| 历史归档 | `reports/consult-deepen/round1-gate/archive/<yyyyMMdd-HHmmss>/`（32–37 行） |
| 覆盖率基线 / 本轮报告 | `reports/consult-deepen/baseline-round0.md`、`reports/consult-deepen/coverage-round1.md` |
| persisted 巡检日志 | `reports/consult-deepen/patrol-20261026-0019/patrol-bun-test-r2.log`、`patrol-coverage.log`（口径见 `coverage-round1.md` §1.2） |

### 10.2 归档行为

- 每次执行 `gate.ps1` 启动时，先把 `round1-gate/` 根目录下既有 `gate-*.log` 移入 `archive/<时间戳>/`，历史日志**不删除**（`gate.ps1` 10–11、31–37 行）。
- `gate-6` 测试日志与 `gate-7` 覆盖率日志一并归档留痕。

### 10.3 回滚口径

- 本手册不执行源码回滚；代码 / 文档变更回滚由 git 分支 `consult-agent-m86` 管理。
- 门禁日志只追加归档，不承担配置回滚职责；若某段日志显示环境异常（`ANOMALY=-1`），先按 §8 对应症状排查环境与文件清单，不直接判定代码失败（`gate.ps1` 20–21、159–161 行口径）。

### 10.4 清理步骤（人工、按需）

1. 仅允许清理 `archive/` 下超过保留期的历史归档目录；清理前先核对 `gate-summary.log` 中对应段是否已完成归档。
2. **禁止删除**：`coverage-round1.md`、`baseline-round0.md`、`patrol-20261026-0019/` 巡检日志、当期 `gate-summary.log`。
3. 当期 `round1-gate/` 根目录日志由下次门禁启动时自动归档，不需要手工移动。
4. 前端构建产物、`coverage/` 目录、`*.tsbuildinfo` 的清理口径见根 `package.json` `clean` 脚本（`rimraf dist build coverage *.tsbuildinfo tsconfig.tsbuildinfo`），与 consult 门禁日志相互独立。

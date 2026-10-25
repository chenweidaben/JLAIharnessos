# 健澜AI原生医院操作系统OS · consult-agent 深化轮终态门禁复跑与验收报告（deepen round 1 终态档）

- 所属产品：**健澜AI原生医院操作系统OS**
- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 分支：`consult-agent-m86`
- 基线 HEAD（档案记载，`reports/consult-deepen/baseline-round0.md` §1）：`d0c2d79756cacd75960bd7563ba8d9b186127270`
- 本轮报告撰写时点实测本地 HEAD（`git rev-parse HEAD`）：`dd0f94e58060584acbaafdf73918809be05abd4a`
- 落档日期：2026-10-26（Asia/Shanghai，UTC+08:00）
- 报告性质：终态全量门禁复跑留证、既有失败用例隔离留档、仓库级构建尝试如实记录；本轮**未修改**任何源码 / 测试 / 前端 / 既有文档，**未执行** `git add` / `git commit` / `git push`。

---

## 1. 封面与范围

### 1.1 本轮范围

本轮为 consult-agent 深化加固的**终态复核与留档**轮，不是从零重建：

- 复跑 `scripts/consult-agent/gate.ps1` 八段专项门禁，取终态权威口径；
- 独立复核仓库根 TypeScript 与 `web/` 本地 TypeScript；
- 复现并隔离两条基线遗留失败用例（只留档、不修复、不计入本轮口径）；
- 如实记录根目录与 `web/` 两次仓库级构建尝试结果；
- 逐条磁盘复核医疗合规红线、权限码映射、产品名在位与旧称扫描；
- 对照 9 条验收口径给出状态、证据位置与说明。

本轮引用的已完成深化成果（无需本轮重做，仅引用其测试与文档证据）：前端两文件规则债清零与五预留能力接线；仓储 13 方法 mock pool 契约；12 端点错误分支与合规；核心八文件分支补测；DDL 380–385 六表静态自洽；门禁脚本 `scripts/consult-agent/gate.ps1`；六篇深化文档 `docs/consult-agent/08-adr.md`、`09-permission-matrix.md`、`10-fmea.md`、`11-test-coverage-matrix.md`、`12-runbook.md`、`13-contract-reconciliation.md` 与 `docs/consult-agent/README.md` 更新。

### 1.2 不在范围清单

- **G1–G5 边界文件**：`src/db/pool.ts`、`src/security/encryption/FieldCipher.ts`、`src/bff/routes/health.ts`、`src/bff/routes/imaging.ts`、`src/bff/routes/twin3DInpatient.ts`，属另一路 B 类后端改动，本轮未改源码与专属测试（归属见 §10.1）。
- **B 类品牌旧称**：55 命中 / 6 文件，归属其他组（基线档案 `baseline-round0.md` §9），不计 consult 债务。
- **C 类基线遗留旧称**：52 命中 / 11 文件，归属其他组（同上）。
- **服务与推理旁路**：`services-java`（Maven / JVM）、`services-python/radar-inference` 不在本机验证范围。
- **共享基础设施历史债务**：`web/src/router/index.tsx`、`src/bff/server.ts` 不在本轮改写范围。
- 本轮不执行分组提交、双仓推送与镜像核对（状态见 §11）。

---

## 2. 验收清单对照总表

> 状态口径：**达成**＝本轮实测证据闭环；**部分达成**＝主体闭环、残余项已在 §9 如实标注；**未闭环-环境缺口**＝受本机环境硬约束，无法在 DEMO 进程内口径内闭环。证据位置均为本轮可复核路径或落档日志。

| # | 验收口径 | 状态 | 证据位置 | 说明 |
|---|---|---|---|---|
| ① | 前端规则债清零与五预留能力接线 | **达成** | 基线债档：`reports/consult-deepen/baseline-round0.md` §3；本轮门禁：`reports/consult-deepen/round1-gate/gate-summary.log`（`ESLINT_FE_ROOT_SERVICE`、`ESLINT_FE_ROOT_PAGE`、`ESLINT_FE_LOCAL` 三段 `EXIT=0`、`health=ok`，`--max-warnings 0`）；服务层 `web/src/services/api/consultAgent.ts` 317 / 322 / 328 / 333 / 341 / 349 / 357 / 362 / 370 / 376 / 536 / 551 共 12 个服务函数；页面接线 `web/src/pages/consult-agent/ConsultAgentChatPage.tsx`：转写 642–661（按钮 1123–1133）、审计 664–679（按钮 861–871）、规则快照 682–694（按钮 825–835）、事件回放 712–754（按钮 837–847）、画像 697–709（按钮 849–858）；置信度标签 558–561；`onDone.messageId` 本地回填 562–575 | 基线页面 7 errors + 1 warning、服务 1 warning（`baseline-round0.md` §3）本轮全部消化；五预留能力（`transcribe` / `listAudit` / `getRulesSnapshot` / `replayEvents` / `getProfile`）已挂 UI 并受页面权限派生值包裹，未前端假连 |
| ② | 后端仓储 / 路由 / 核心分支 / DDL 测试深化 | **达成** | 下列括号内为静态 `it` / `expect` / `describe` 源码计数（口径见 `11-test-coverage-matrix.md` §1.4，与运行时展开用例数不互相替代；运行时分段 pass 见 §4.2）：仓储契约 `tests/unit/consult-agent/consultAgentRepo.test.ts`（40 / 309 / 13，Postgres 13 方法 mock pool 契约）；路由错误分支 `tests/integration/consult-agent/consultRouteErrors.test.ts`（30 / 192 / 8，400 / 404 / 409 / 500 映射与 SSE 成功路径）；主链路 `tests/integration/consult-agent/consultFlow.test.ts`（7 / 91 / 1）；核心八文件分支补测：`audit.test.ts`（7 / 44 / 4）、`orchestratorBranches.test.ts`（3 / 33 / 3）、`profileMemoryBranches.test.ts`（5 / 13 / 2）、`roleSupport.test.ts`（3 / 9 / 2）、`safeLlm.test.ts`（7 / 24 / 2）、`sessionRuntime.test.ts`（8 / 26 / 5）、`supervisorBranch.test.ts`（8 / 14 / 2）、`toolRegistryBranches.test.ts`（8 / 28 / 4）；DDL 静态自洽 `tests/unit/consult-agent/ddlSchema.test.ts`（20 / 54 / 6）；DDL 汇总见 §3 gate-6 stdout 留档 | 380–385 六表静态对齐；仓储列 ↔ DDL 双向对齐；核心未覆盖分支（哨兵驳回、画像抽取、证据构造、离线三态、运行时读写、分诊路由、注册表异常安全）本轮补测；真实 PostgreSQL 查询闭环状态见 §9 |
| ③ | 覆盖率实测留档 | **达成** | `reports/consult-deepen/coverage-round1.md` §1.3、§2、§3；原始日志 `reports/consult-deepen/coverage-round1.log`；本轮门禁 `gate-7-coverage-err.log`（All files 88.81% Funcs / 91.20% Lines，逐字一致） | 数字逐字取自落档日志，未估算；statements / branches 两维 reporter 未提供，报告不虚构（见 §4.5） |
| ④ | 工程文档补齐与三端契约复核 | **达成** | 六篇新文档 `docs/consult-agent/08-adr.md` … `13-contract-reconciliation.md`；索引 `docs/consult-agent/README.md` §2（17–31 行）；三端复核 `13-contract-reconciliation.md` §3.1–§3.12（12 端点）、§4（SSE 八类事件三端对照）、§4.1（结束帧与响应头）、§4.2（流路由与幂等键）、§5（D1–D6 残余偏差与口径说明） | 12 端点方法 / 路径 / 权限码 / 幂等 / 审计 / 请求体 / 响应体 / SSE 事件三端一致；仅 D1 一项文档层遗漏（OpenAPI 未声明端点 10 非法 `kind` 的 400），本轮按纪律不改源码与规范，列入后续契约修订 |
| ⑤ | 专项门禁脚本固化 | **达成** | `scripts/consult-agent/gate.ps1`（10,188 字节）；分段口径与归档规则见 `docs/consult-agent/12-runbook.md` §5、§6、§10 | 八段顺序固定：1 根 tsc → 2 后端 ESLint → 3a 前端 service → 3b 前端 page → 4 前端本地 ESLint → 5 Prettier → 6 bun 三目录测试 → 7 覆盖率；启动自动归档既有 `gate-*.log`，只归档不删除 |
| ⑥ | 终态全量门禁回归 | **达成** | `reports/consult-deepen/round1-gate/gate-summary.log`；分段日志 `gate-1-tsc.log` … `gate-7-coverage-err.log`；归档 `round1-gate/archive/20261026-032253/` | 本轮 2026-10-26 03:22:53 启动、03:25:03 收尾；八段 `EXIT=0`、`health=ok`、无 `ANOMALY=-1`；`FAILURE_SECTIONS=0`、`ANOMALY_SECTIONS=0`；进程退出码 0（明细见 §3） |
| ⑦ | 分组提交与双仓核对 | **未执行（待 #38 环节执行）** | 本轮工作区状态：跟踪改动 3 个文件（`docs/consult-agent/README.md`、`web/src/pages/consult-agent/ConsultAgentChatPage.tsx`、`web/src/services/api/consultAgent.ts`）；未跟踪新增见 §6 与 §11 | 本轮报告撰写时**未执行** `git add` / `git commit` / `git push`；不声明任何推送完成后的双仓一致性结论；JLMEDAIOS `master` 普通 fast-forward、HEAGENTOS `main` force-main 口径、GitHub `mirror` 只核对不推，均待后续环节（口径见 §11） |
| ⑧ | 合规红线在位 | **达成** | 逐条证据见 §5 合规红线核验矩阵 | 草稿三红线、急症旁路、审计脱敏、免责常驻、产品名在位、12 端点权限码守卫映射均在源码与前端复核在位；未发现回退 |
| ⑨ | 环境缺口如实标注 | **达成（部分达成：DEMO 进程内口径内闭环，真实环境项如实列缺口）** | `reports/consult-deepen/coverage-round1.md` §6；`docs/consult-agent/12-runbook.md` §9；本报告 §9 | 无运行中 PostgreSQL、无 LLM 凭证、未做真实 SSE / HTTP 端到端联调、未做浏览器视觉走查；上述项均如实标注为未闭环，不伪造通过 |

---

## 3. 终态门禁证据表

### 3.1 一键门禁复跑汇总

执行命令（仓库根）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/consult-agent/gate.ps1
```

- 进程退出码：**0**（脚本 `gate.ps1` 末段汇总，`FAILURE_SECTIONS=0` 时退出码 0）。
- 汇总日志：`reports/consult-deepen/round1-gate/gate-summary.log`。
- 启动：`TSC_ROOT_START 03:22:53`；收尾：`=== gate done 2026-10-26 03:25:03 | FAILURE_SECTIONS=0 ANOMALY_SECTIONS=0 ===`。

### 3.2 八分段明细（退出码、health、关键日志行逐字取自 `gate-summary.log` 与分段日志）

| 段序 | 段名（脚本内部） | 命令摘要（node 直调 bin / bun 绝对路径） | 退出码 | health | ANOMALY | 关键日志行 / 规模 |
|---|---|---|---:|---|---|---|
| 1 | `TSC_ROOT` | 仓库根 `node node_modules/typescript/lib/tsc.js --noEmit` | 0 | `ok` | 无 | `gate-1-tsc.log` 0 字节、`gate-1-tsc-err.log` 0 字节，无诊断输出 |
| 2 | `ESLINT_BE` | `node node_modules/eslint/bin/eslint.js` core 26 个 consult `.ts` + `src/bff/routes/consultAgentRoutes.ts` + `src/db/repositories/consultAgentRepo.ts`，`--max-warnings 0` | 0 | `ok` | 无 | `gate-2-eslint-be.log` 0 字节；`gate-2-eslint-be-err.log` 293 字节，仅 `.eslintignore` 弃用框架提示（非代码问题，不计 warning），无 `error` / `✖` / `problems` 行 |
| 3a | `ESLINT_FE_ROOT_SERVICE` | 仓库根根配置，单文件 `web/src/services/api/consultAgent.ts`，`--max-warnings 0` | 0 | `ok` | 无 | `gate-3a-eslint-fe-root-service.log` 0 字节；`-err.log` 292 字节，仅同上弃用框架提示 |
| 3b | `ESLINT_FE_ROOT_PAGE` | 仓库根根配置，单文件 `web/src/pages/consult-agent/ConsultAgentChatPage.tsx`，`--max-warnings 0` | 0 | `ok` | 无 | `gate-3b-eslint-fe-root-page.log` 0 字节；`-err.log` 293 字节，仅同上弃用框架提示 |
| 4 | `ESLINT_FE_LOCAL` | `cwd=web`，`web/eslint.config.js`（非 type-checked 本地配置），两文件相对路径 | 0 | `ok` | 无 | `gate-4-eslint-fe-local.log` 0 字节；`-err.log` 293 字节，仅同上弃用框架提示 |
| 5 | `PRETTIER` | `node node_modules/prettier/bin/prettier.cjs --check` 57 个显式 consult 文件（core 26 + 路由 + 仓储 + service + page + 三目录 27 个 `.ts`，含 `tests/unit/consult-agent/helpers.ts` 夹具） | 0 | `ok` | 无 | `gate-5-prettier.log` 66 字节：`Checking formatting…` / `All matched files use Prettier code style!`；`gate-5-prettier-err.log` 0 字节 |
| 6 | `BUN_TEST` | `C:\Users\lenovo\.bun\bin\bun.exe test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent`（`DEMO_MODE=1`） | 0 | `ok` | 无 | `gate-6-bun-test.log` 312 字节（`bun test v1.2.0 (b0c5a765)` + DDL 静态校验汇总）；`gate-6-bun-test-err.log` 41,024 字节，尾部逐字：`326 pass` / `0 fail` / `2090 expect() calls` / `Ran 326 tests across 26 files. [17.65s]` |
| 7 | `COVERAGE` | `C:\Users\lenovo\.bun\bin\bun.exe test --coverage --coverage-reporter text` 三目录（`DEMO_MODE=1`） | 0 | `ok` | 无 | `gate-7-coverage.log` 312 字节；`gate-7-coverage-err.log` 44,271 字节；All files 行逐字：`All files \| 88.81 \| 91.20 \|`；尾部逐字：`326 pass` / `0 fail` / `2090 expect() calls` / `Ran 326 tests across 26 files. [17.49s]` |

### 3.3 汇总末行（`gate-summary.log` 末行逐字）

```
=== gate done 2026-10-26 03:25:03 | FAILURE_SECTIONS=0 ANOMALY_SECTIONS=0 ===
```

- `FAILURE_SECTIONS=0`：八段无非零退出码、无 health=`warn`。
- `ANOMALY_SECTIONS=0`：八段进程退出码均为有效数值，无 `null` / `-1` 环境异常段。

### 3.4 独立类型检查复核（门禁段 1 之外的补测口径）

| 复核项 | 工作目录 | 命令 | 退出码 | stdout 字节 | stderr 字节 | 结论 |
|---|---|---|---:|---:|---:|---|
| 根 TypeScript | 仓库根 | `node node_modules/typescript/lib/tsc.js --noEmit` | 0 | 0 | 0 | 无诊断输出，与门禁段 1 一致 |
| `web/` 本地 TypeScript | `web/` | `node node_modules/typescript/lib/tsc.js --noEmit`（对应 `web/package.json` `typecheck`） | 0 | 0 | 0 | 无诊断输出；门禁八段不含 web 本地 tsc，本段为 12-runbook §7.4 口径的独立复核 |

### 3.5 DDL 380–385 静态自洽留档（gate-6 stdout 首段汇总，逐字口径）

`gate-6-bun-test.log` 中 `[ddlSchema 静态校验汇总]`：表数 6、列数 66、索引数 7、外键数 9、主键数 6、唯一约束额外数 2、序列数 0、触发器数 3；仓储 `mapRow` 列 63、`INSERT` 列 66、`WHERE` 列 8、`ORDER` 列 5。六表文件字节数与基线档案 §7 一致：`380-consult-threads.sql` 6587、`381-consult-messages.sql` 2615、`382-consult-documents.sql` 2076、`383-consult-drafts.sql` 3841、`384-consult-audit-trail.sql` 2560、`385-consult-profile-memory.sql` 2053（schema 均为 `consult`）。

---

## 4. 测试与覆盖率对比

### 4.1 规模与汇总覆盖率对照（基线 → 本轮）

| 口径 | 基线（round 0） | 本轮（round 1 门禁实测） | 差值 |
|---|---|---|---|
| pass | 177 | 326 | +149 |
| fail | 0 | 0 | — |
| `expect()` 调用 | 659 | 2090 | +1431 |
| 测试文件数 | 15 | 26 | +11 |
| 功能测试耗时（日志逐字） | 12.57s（`baseline-bun-consult-round0.log`） | 17.65s（`gate-6-bun-test-err.log`） | 自然波动 |
| 覆盖率运行耗时（日志逐字） | 11.84s（`baseline-coverage-round0.log`，见 `coverage-round1.md` §1.3） | 17.49s（`gate-7-coverage-err.log`） | 自然波动 |
| All files `% Funcs` | 84.49 | 88.81 | +4.32 pt |
| All files `% Lines` | 85.25 | 91.20 | +5.95 pt |

> 耗时口径说明：本轮门禁 `gate-6` 17.65s、`gate-7` 17.49s；`coverage-round1.md` §1.3 落档的 persisted 巡检口径为功能测试 17.63s、覆盖率运行 19.68s。两次独立执行耗时含进程内 DEMO 仓储装载与 SSE 帧回放等待，存在自然波动；pass / fail / expect / 文件数与 Funcs% / Lines% 两口径逐字一致，本报告门禁段以本轮 `gate-6` / `gate-7` 日志为准。

### 4.2 本轮分段 pass（gate-6 日志按目录解析，合计 326，与汇总一致）

| 分段 | 测试目录 | pass | 测试文件数 |
|---|---|---:|---:|
| 单元 | `tests/unit/consult-agent/` | 210 | 23（另有 `helpers.ts` 夹具 1 个，不计 bun 测试文件口径） |
| 安全 | `tests/security/consult-agent/` | 69 | 1（`permissions.test.ts`） |
| 集成 | `tests/integration/consult-agent/` | 47 | 2（`consultFlow.test.ts`、`consultRouteErrors.test.ts`） |
| **合计** | 三目录 | **326** | **26** |

### 4.3 11 个 consult 核心文件 Funcs / Lines 对照（数字逐字摘自 `coverage-round1.md` §3.1，未估算；ΔLines = 本轮 `% Lines` − 基线 `% Lines`）

| # | 源码文件（相对路径） | 基线 %Funcs | 基线 %Lines | 基线未覆盖行 | 本轮 %Funcs | 本轮 %Lines | 本轮未覆盖行 | ΔLines |
|---:|---|---:|---:|---|---:|---:|---|---:|
| 1 | `src/bff/routes/consultAgentRoutes.ts` | 94.87 | 87.65 | 97,101-102,109,150-154,160-161,185,210,212-227,258-261,322-325,392,394-404,520-523 | 94.87 | 98.14 | 150-154,160-161 | +10.49 |
| 2 | `src/core/agent/consult/audit/index.ts` | 83.33 | 94.12 | 27,38 | 100.00 | 100.00 | — | +5.88 |
| 3 | `src/core/agent/consult/consultOrchestrator.ts` | 100.00 | 92.20 | 67,131,257,292-307,343-346 | 100.00 | 98.98 | 67,257 | +6.78 |
| 4 | `src/core/agent/consult/llm/safeLlm.ts` | 66.67 | 96.15 | —（日志未列行号） | 85.71 | 100.00 | — | +3.85 |
| 5 | `src/core/agent/consult/memory/profileMemory.ts` | 100.00 | 92.39 | 127-132 | 100.00 | 100.00 | — | +7.61 |
| 6 | `src/core/agent/consult/roleSupport.ts` | 71.43 | 51.28 | 31-36,41-53 | 100.00 | 100.00 | — | +48.72 |
| 7 | `src/core/agent/consult/runtime/sessionRuntime.ts` | 75.00 | 76.77 | 27,141-153,160,165,170-176 | 92.11 | 100.00 | — | +23.23 |
| 8 | `src/core/agent/consult/supervisor.ts` | 100.00 | 84.00 | 41-43 | 100.00 | 100.00 | — | +16.00 |
| 9 | `src/db/repositories/consultAgentRepo.ts` | 37.84 | 14.69 | 40,98,102,111-124,128-141,145-162,166-179,183-189,193-203,208-399（长清单见 `coverage-round1.md` §3.1 第 9 行） | 94.00 | 99.05 | 98 | +84.36 |
| 10 | `src/core/agent/consult/tools/toolRegistry.ts` | 94.59 | 100.00 | —（日志未列行号） | 97.30 | 100.00 | — | 0.00 |
| 11 | `src/core/agent/consult/intentClassifier.ts` | 100.00 | 98.59 | —（日志未列行号） | 100.00 | 98.59 | —（日志未列行号） | 0.00 |

### 4.4 残余未覆盖行裁决单元与不可达定性（引用 `coverage-round1.md` §4，逐条复核源码后裁决，不把不可达或环境未闭环条目标注为已覆盖）

| 裁决单元 | 文件 / 行号 | 源码语义 | 定性 |
|---|---|---|---|
| 4.1-a | `src/bff/routes/consultAgentRoutes.ts` 150-154 | `openSseStream` 内 `c.req.signal` 的 `abort` 监听回调：置 `closed`、清定时器、关闭控制器 | 测试边界内**不可达**：fake Request 无法模拟真实客户端中途断流；需 HTTP 层真实连接事件触发，留待真实 SSE / HTTP 联调阶段补覆盖 |
| 4.1-b | `src/bff/routes/consultAgentRoutes.ts` 160-161 | `ReadableStream` 下游 `cancel` 回调：置 `closed`、清定时器 | 测试边界内**不可达**：需浏览器 / 客户端主动取消流事件触发，同上阶段补覆盖 |
| 4.2 | `src/core/agent/consult/consultOrchestrator.ts` 67 | `transitionTo(thread, target)` 同状态早退防御 `return` | 测试边界内**不可达**：公开入口目标态与当前态恒不相等，不存在公开入参触发同状态调用；属防御性早退语句 |
| 4.3 | `src/core/agent/consult/consultOrchestrator.ts` 257 | 角色注册表取 supervisor 失败的守卫 `throw new Error('SUPERVISOR_ROLE_MISSING')` | 测试边界内**不可达**：注册表工厂硬编码四角色，公开路径无法构造缺失 supervisor 的注册表；属防御性 fail-closed 语句 |
| 4.4 | `src/db/repositories/consultAgentRepo.ts` 98 | `DemoConsultRepo.listDocuments(threadId)` 方法声明（99 行委托语句未列入未覆盖清单） | mock pool 用例先置 `DEMO_MODE='0'` 返回 `PostgresConsultRepo`，DEMO 委托方法未被触达；**不属**真实 PostgreSQL 查询分支缺口；真实 DB 路径闭环状态见 §9 |
| 4.5 | `safeLlm.ts` / `sessionRuntime.ts` / `toolRegistry.ts`（Lines 均为 100.00，Funcs 残余） | 三文件公开具名函数 / 方法均已在 DEMO 测试中被直接或间接调用；残余为 bun 函数计数器口径下的内部回调 / 初始化单元计数差异 | reporter 不按函数名列示残余单元，**不为残余单元指派具体公开函数名**；不构成未覆盖业务分支 |
| 4.6 | `src/core/agent/consult/intentClassifier.ts` 116-117（源码静态核对指向，reporter 未列行号） | `classifyIntent`「无关键词命中但处于 Examiner 追问上下文」兜底分支 | 与基线同值（Lines 98.59 未变），属遗留分支，**不计入本轮新增缺口**；该行号为源码静态指向，不作为 reporter 实测行号引用 |

### 4.5 覆盖率维度声明（不虚构 reporter 未提供的两维）

bun text reporter 仅输出 `% Funcs`、`% Lines`、`Uncovered Line #s` 三列，**不提供 statements 与 branches 独立百分比**；本报告与 `coverage-round1.md`、`11-test-coverage-matrix.md` 一致，不给出 statements / branches 两维数字，需要该两维结论处一律标注「本环境 reporter 未提供该维度」。

### 4.6 两轮均 100.00 / 100.00 文件清单

20 个文件在基线与本轮两份日志中 Funcs、Lines 均为 100.00，未覆盖行号列为空（清单逐字见 `coverage-round1.md` §3.2 与 `11-test-coverage-matrix.md` §3），含 `src/bff/permissions.ts`、`src/bff/types.ts`、核心包 `demoSeed.ts`、`draftHash.ts`、`index.ts`、`shortTermMemory.ts`、四角色实现与 `internal.ts`、`roles/index.ts`、`acuteVocabulary.ts`、`safetyGate.ts`、`sentinelGateway.ts`、`stateMachine.ts`、`evidenceExtractor.ts`、`types.ts`、`tests/support/testEnv.ts`、`tests/unit/consult-agent/helpers.ts`。

---

## 5. 合规红线核验矩阵

> 复核方式：逐项 `[IO.File]::ReadAllText(文件路径, UTF8 编码)` 读取源码与前端文件，按字段 / 常量 / 守卫 / 文案在位核对；扫描范围为本报告 §1.1 所列 consult 交付树。

| # | 红线项 | 服务端证据位置 | 前端证据位置 | 在位结论 | 回退说明 |
|---:|---|---|---|---|---|
| 1 | 草稿红线一：`needsPhysicianReview: true` | `src/core/agent/consult/types.ts` 135 行字面量 `needsPhysicianReview: true`；zod 234 行 `needsPhysicianReview: z.literal(true)`；`src/core/agent/consult/sentinel/sentinelGateway.ts` 43–44 行非 `true` 即驳回 | `web/src/pages/consult-agent/ConsultAgentChatPage.tsx` 254 行 `{draft.needsPhysicianReview && <Tag color="red">需执业医师复核</Tag>}`，由草稿字段驱动 | **在位** | 未发现改为 `false`、可选或前端本地改写；反例被 zod 字面量与哨兵双闸拒绝（`tests/unit/consult-agent/typesSchema.test.ts`、`sentinel.test.ts`） |
| 2 | 草稿红线二：`isOutOfHospitalPrescription: false` | `types.ts` 137 行字面量 `isOutOfHospitalPrescription: false`；zod 235 行 `z.literal(false)`；`sentinelGateway.ts` 46–47 行非 `false` 即驳回 | `ConsultAgentChatPage.tsx` 255–257 行：处方类草稿 `!draft.isOutOfHospitalPrescription` 时渲染「非院外处方」标签，由草稿字段驱动 | **在位** | 未发现 `true` 通道；服务端为权威闸，前端标签仅作展示 |
| 3 | 草稿红线三：`status: 'pending_review'` | `types.ts` 52 行 `export type DraftStatus = 'pending_review'`；138 行 `status: DraftStatus`；zod 236 行 `status: z.literal('pending_review')`；`sentinelGateway.ts` 49–55 行非 `pending_review` 即驳回 | `ConsultAgentChatPage.tsx` 96 行状态映射 `review_pending: '待医师复核'`；296 行正文固定标注「AI 辅助建议，待医师复核，不构成诊断或处方决策。」 | **在位** | 草稿状态由服务端字面量与哨兵强制；前端不提供状态改写入口；复核通过后的状态流转不在本期范围（ADR-004 残余，见 `10-fmea.md` FMEA-04） |
| 4 | 急症旁路：先判安全，acute 转 `escalated`，不进角色、不产草稿、不调工具 | `src/core/agent/consult/consultOrchestrator.ts` 138 行 `evaluateSafety(userText)` 先于 `classifyIntent`（182 行）；141–180 行旁路整段：142 行 `transitionTo(thread, 'escalated')`、143 行 `intent='acute_emergency'`、145 行 `thread.currentRole = null`、162 行 `toolCalls: null`、179 行返回 `draft: null`；148–154 行落 `acute_bypass` 审计；169–173 行仅下发 `safety:acute` / `disclaimer` / `done` 三事件 | `ConsultAgentChatPage.tsx` 555 行 `onAcute`（流式）、739 行 `onAcute`（回放）；760 行 `acuteGuidance = acute?.guidance ?? ACUTE_GUIDANCE`；87–88 行 `ACUTE_GUIDANCE` 常量；973 行常驻 120 急症提醒横幅 | **在位** | 旁路段在角色装配、哨兵审批、工具调用之前 `return`；未发现 acute 路径进入角色分派或生成草稿；前端 120 横幅常驻，非条件隐藏 |
| 5 | 急症引导常量 `ACUTE_GUIDANCE` | `types.ts` 254–255 行 `ACUTE_GUIDANCE` 常量；`consultOrchestrator.ts` 159 行引导消息、170 行 `safety:acute` 事件 `guidance` 均取该常量 | `ConsultAgentChatPage.tsx` 87–88 行同名常量，文案与后端字面量一致 | **在位** | 未发现引导文案被替换为诊疗结论 |
| 6 | 审计脱敏：仅留脱敏摘要，不回显原始入参 | `src/core/agent/consult/audit/index.ts` 14 行 `RAW_ARG_KEY_PATTERN`；18–33 行 `redactRawArgs` 主体；36–44 行嵌套对象 / 数组递归脱敏；61 行 `createAuditEntry`；73 行落库前 `detail: redactRawArgs(原始入参对象)`；79–97 行 `createToolCallRecord` 仅保留调用方 ID / 工具名 / 状态 / 耗时 / 证据数 / 错误分类 / `summary`，结构上不存在原始入参槽位 | `ConsultAgentChatPage.tsx` 1213 行抽屉标题「审计轨迹（仅脱敏摘要，不回显原始入参）」；862 行按钮 Tooltip 同口径；抽屉明细 1265 行折叠标题「脱敏摘要」 | **在位** | 工具记录无原始入参字段；嵌套对象 / 数组递归分支由 `audit.test.ts` 覆盖；键名模式清单随新审计动作同步维护（残余提示见 `10-fmea.md` FMEA-05） |
| 7 | 免责常驻：`DISCLAIMER` 常量、每条 assistant 回复下方、页面底部常驻 | `types.ts` 250–251 行 `DISCLAIMER` 常量；编排器在急症旁路 165 行、171 行，退出 218 / 223 行，常规问诊 372 / 381 / 385 行均随消息或事件携带 | `ConsultAgentChatPage.tsx` 83–84 行 `DISCLAIMER` 常量；1110 行每条 assistant 回复下方，`message.disclaimer` 为空串时回退 `DISCLAIMER` 常量文案；1162–1173 行页面底部常驻免责 | **在位** | 未发现移除底部常驻或省略每条回复下方免责；`disclaimer` 帧经 `consultAgent.ts` 446–448 解析后下发，空串由页面 1110 行兜底为常量文案 |
| 8 | 120 常驻提示 | 后端急症事件 `safety:acute` 携带 `guidance`（`consultOrchestrator.ts` 170） | `ConsultAgentChatPage.tsx` 973 行「急症提醒：请立即就医或拨打 120」常驻横幅；`ACUTE_GUIDANCE` 87–88 行内含 120 口径 | **在位** | 未发现 120 提示被条件渲染关闭 |
| 9 | 产品名「健澜AI原生医院操作系统OS」在位 | 核心种子 `src/core/agent/consult/demo/demoSeed.ts` L16 问候语 1 处；DDL 静态测试 `tests/unit/consult-agent/ddlSchema.test.ts` L2 头部注释 1 处；基线档案与覆盖率报告各 1 处（`baseline-round0.md`、`coverage-round1.md`） | 文档集 `docs/consult-agent/` 14 个文件共 18 处（含 `README.md` L5、08–13 各篇头部与 01–07 既有文档） | **在位** | 服务端路由 / 仓储 / 前端服务与页面以功能模块名命名，产品名归属文档与品牌层；交付树内未发现旧称回退（第 10 项扫描口径） |
| 10 | 旧称扫描（基线档案 §8 列示的六类旧称变体，清单原文见 `baseline-round0.md` §8，本报告正文不重复抄录旧称字面量） | 扫描范围：`src/core/agent/consult/`、`src/bff/routes/consultAgentRoutes.ts`、`src/db/repositories/consultAgentRepo.ts`、`web/src/services/api/consultAgent.ts`、`web/src/pages/consult-agent/`、`docs/consult-agent/`、`tests/unit/consult-agent/`、`tests/security/consult-agent/`、`tests/integration/consult-agent/`、`scripts/consult-agent/`、`reports/consult-deepen/` | 同左 | **交付源码 / 文档 / 测试 / 脚本命中 0** | `reports/consult-deepen/` 内仅检出 2 行模式定义文本：`baseline-round0.md` §8 L104 禁用模式清单反引号串、`reports/consult-deepen/patrol-20261026-0308/patrol-compliance.ps1` L27 `$legacy` 扫描正则字面量；两处命中计数为模式串内各变体 token 数，均为「模式说明文本」，不是品牌旧称使用，不计交付命中。本报告自身正文旧称字面量命中 0（自检见 §12.4） |
| 11 | 12 端点权限码守卫映射 | `src/bff/permissions.ts` 207–211 行三码常量（READ 208、WRITE 209、AUDIT 210）；12 个 handler 首行 `requirePermissionCode`，映射见 `src/bff/routes/consultAgentRoutes.ts` 179（WRITE）、239（READ）、252（WRITE）、296（READ）、313（WRITE）、340（AUDIT）、357（READ）、382（WRITE）、417（READ）、515（READ）、540（READ）、553（WRITE） | 页面权限派生 `ConsultAgentChatPage.tsx` 322–325（`hasPermission` / `canWrite` / `canAudit` / `canRead`）；前端二次判权口径见 `09-permission-matrix.md` §4 | **在位**：WRITE 5（端点 1 创建会话、3 发送消息、5 语音转写、8 流式问诊、12 退出会话）；READ 6（端点 2 会话列表、4 历史消息、7 规则快照、9 事件回放、10 草稿查询、11 用户画像）；AUDIT 1（端点 6 审计轨迹）；端点 8 为 **POST**（路由 378 行、OpenAPI 264 行、服务层 `consultAgent.ts` 544 行三处一致） | 前端无权限入口不渲染，回调内首行再判权；服务端为权威闸，未发现前端绕过权限映射 |
| 12 | 凭据 / 密码 / token 不内嵌交付 | 对核心包、路由、仓储扫描 `sk-` 长串字面量、`password=` / `secret=` / `api_key=` 赋值字面量：0 命中 | 对前端 service / page、三目录测试、六篇文档、门禁脚本同口径扫描：0 命中 | **在位** | 凭证键仅以 `process.env` 键名引用（`llm/safeLlm.ts` 22 行三个环境变量名），不含取值；`origin` 历史内嵌 token 不沿用 |

---

## 6. 深化文档清单

> 索引：`docs/consult-agent/README.md` §2（17–31 行）已链接 08–13；01–07 既有文档本轮未修改（`git status --porcelain` 核对 clean）。

| 文档路径 | 一句话内容 | 验收计数 / 核对口径 |
|---|---|---|
| `docs/consult-agent/08-adr.md` | 架构决策记录：DEMO 仓储短路、离线引导、四角色注册表、哨兵三红线、审计脱敏、SSE 契约、三权限码、幂等装配、状态机纯函数、画像合并、工具白名单、前端二次判权、置信度与 messageId 回填、急症旁路前置 | **14 条 ADR**：`ADR-001` … `ADR-014`（标题行 27、48、69、90、113、135、158、180、202、223、244、265、289、312 行），编号连续无重复 |
| `docs/consult-agent/09-permission-matrix.md` | 三权限码定义与角色映射、12 端点权限 / 幂等 / 审计 / SSE 矩阵、前端二次判权、错误码对照与边界归属 | **12 端点行**（§3 表 55–66 行，端点 8 为 POST `/threads/:threadId/stream`）；**6 条错误码行**（401 / 403 / 404 / 409 / 400 / 500，§6 表 114–119 行）；角色映射：admin 三码全持、doctor READ+WRITE、nurse READ（§2 表 26–30 行） |
| `docs/consult-agent/10-fmea.md` | 故障模式与降级矩阵：失效模式、触发条件、业务影响、S/O/D 评分与 RPN、现有缓解措施、残余风险与责任层 | **21 个 distinct FMEA**：`FMEA-01` … `FMEA-21`（表行 39–59 行）；33、74、75 行为交叉引用，不另计编号 |
| `docs/consult-agent/11-test-coverage-matrix.md` | 测试分层口径、源码模块 → 测试文件覆盖对照、Funcs% / Lines% 逐字口径、未覆盖行可达性裁决、边界文件与环境缺口 | 引用 **25 个 consult 核心源文件**（`src/core/agent/consult/` 下 25 个；另含 BFF 路由与仓储两个交付文件，矩阵内 consult 范围合计 27 个源文件留痕）；覆盖率 88.81% Funcs / 91.20% Lines，与 `coverage-round1.md` §2 逐字一致；statements / branches 未提供口径已声明（§1.3、§3、§4.5） |
| `docs/consult-agent/12-runbook.md` | 运行与排障手册：环境变量、依赖与目录速览、一键门禁八段日志（3a / 3b 拆分）、单独测试 / 覆盖率命令、16 条症状排查表、环境硬约束与日志归档 | §5 八段门禁口径与 `gate.ps1` 一致；§6 分段命令清单可单独复跑；§8 排查表 16 条；§9 环境硬约束 6 条与 `coverage-round1.md` §6 对齐；§10 日志位置与归档规则 |
| `docs/consult-agent/13-contract-reconciliation.md` | OpenAPI / BFF / 前端服务三端契约复核：12 端点逐项比对、SSE 八类事件三处对照、结束帧口径、已知口径与残余偏差清单 | **§3.1–§3.12 共 12 个端点复核小节**（49、59、69、79、89、99、109、119、129、139、149、159 行）；§4 SSE 八类事件三端对照；§5 残余偏差 D1（文档层遗漏 1 项）+ D2–D6 口径说明 5 项；§6 复核结论 |
| `docs/consult-agent/README.md`（修改） | 模块文档索引、代码落点导航、快速说明、安全提示、权限码一览 | §2 表 17–31 行链接 01–13（含 08–13 六篇新文档）；§4 覆盖率与门禁口径与本轮日志一致；本轮唯一修改的既有 consult 文档 |

---

## 7. 基线遗留失败用例隔离（复现、留档、不修复）

> 两条用例均不在 consult 三目录内，属基线遗留；本轮仅复现留证，**未修改测试文件、未修复断言**，不计入 §3 门禁 pass / fail 与 §4 覆盖率口径。复跑环境：`DEMO_MODE=1`，bun 绝对路径 `C:\Users\lenovo\.bun\bin\bun.exe`，单文件执行。

### 7.1 F1 · `tests/unit/onlineConsult.test.ts`（日期硬编码漂移）

| 项 | 实测记录 |
|---|---|
| 复现命令 | `bun test tests/unit/onlineConsult.test.ts`（`DEMO_MODE=1`，仓库根） |
| 进程退出码 | **1** |
| 测试规模（日志尾部逐字） | `9 pass` / `1 fail` / `38 expect() calls`；`Ran 10 tests across 1 files. [1135.00ms]` |
| 失败位置 | `tests/unit/onlineConsult.test.ts:94:48` |
| 失败断言 | `it('空小结拒绝结束；非咨询中状态拒绝')` 内 94 行 `expect(() => endConsultation(c.id, '   ')).toThrow();` |
| 断言摘要 | `error: expect(received).toThrow()` — `Received function did not throw`；收到线程对象 `status: "ended"`、`endReason: "timeout"`、`summary: null`、`acceptedAt: "2026-10-16T08:00:00.000Z"`、`deadlineAt: "2026-10-16T08:30:00.000Z"`、`endedAt: "2026-10-25T19:28:22.059Z"`、`durationSec: 818902` |
| 归属与根因 | 基线遗留（`baseline-round0.md` §10 末条前半，基线档案记为「非 consult 引入，留证不修复」）：接单时间与 30 分钟截止时间为 2026-10-16 硬编码；本轮复跑时点（2026-10-25 19:28）已过截止时间，`sweepTimeouts` 已将该单自动关单为 `timeout`，空小结结束断言在已终态单上不再抛错。属日期漂移导致的基线测试失效，非 consult 模块缺陷 |
| 本轮处置 | 不修改该文件、不修复断言；不计入本轮 pass / fail 与覆盖率；归属其他分组后续处理 |

### 7.2 F2 · `tests/unit/db/ddl.test.ts`（check-sql 对历史 M 系列 SQL 误报）

| 项 | 实测记录 |
|---|---|
| 复现命令 | `bun test tests/unit/db/ddl.test.ts`（`DEMO_MODE=1`，仓库根） |
| 进程退出码 | **1** |
| 测试规模（日志尾部逐字） | `5 pass` / `1 fail` / `2360 expect() calls`；`Ran 6 tests across 1 files. [1029.00ms]` |
| 失败位置 | `tests/unit/db/ddl.test.ts:25:18` |
| 失败断言 | 25 行 `expect(r.ok).toBe(true);`（`verifySql()` 返回值） |
| 断言摘要 | `error: expect(received).toBe(expected)` — `Expected: true` / `Received: false`；失败用例 `PostgreSQL DDL 静态完整性 > 表/序列/触发器/种子全部齐全且自洽 [93.00ms]` |
| 只读探针复核（不改源码、仅调用 `verifySql()` 读取） | `OK=false`；`tables=462`、`seed=2385`；`r.errors` 共 12 条，全部为历史 M 系列 SQL 的「括号不配平」启发式误报：`255-surgery-schedule.sql`（( 19 vs ) 23）、`306-smart-schedule.sql`（15 vs 20）、`316-group-multi-hospital.sql`（32 vs 37）、`319-patient-service-deep.sql`（13 vs 16）、`323-health-plan.sql`（9 vs 19）、`324-emergency.sql`（14 vs 21）、`342-emergency-deep.sql`（14 vs 20）、`352-drg-deep.sql`（33 vs 35）、`356-medical-record-deep.sql`（33 vs 36）、`360-finance-deep.sql`（15 vs 17）、`363-party-culture.sql`（25 vs 32）、`366-insurance-deep.sql`（51 vs 55）；清单中**不含** consult 380–385 六表 |
| 归属与根因 | 基线遗留（`baseline-round0.md` §10 末条后半，基线档案记为「非 consult 引入，留证不修复」）：`scripts/db/check-sql.ts` 括号计数为朴素启发式，未识别字符串字面量 / 注释内括号，对历史 SQL 文件误报；属共享 DB 校验脚本与历史 M 系列分片问题，非 consult 380–385 DDL 缺陷 |
| 本轮处置 | 不修改该文件、不修复断言；不计入本轮 pass / fail 与覆盖率；归属其他分组后续处理 |

---

## 8. 构建尝试记录（仓库级状态，不归入 consult 门禁结论）

> 口径区分：§3 八段门禁全部为 consult 专项口径；本节两次 `bun run build` 是**仓库级**动作，成败可能源于 consult 以外模块或本机环境。本节如实记录退出码与首因，**不把构建失败记为 consult 缺陷，也不把未成功的构建记为成功**。

### 8.1 根目录 `bun run build`（`package.json` `build: bun run build.ts`）

| 项 | 实测记录 |
|---|---|
| 执行命令 | 仓库根 `C:\Users\lenovo\.bun\bin\bun.exe run build.ts`（`DEMO_MODE=1`） |
| 进程退出码 | **0** |
| 控制台环境行 | `环境: development`；`入口数: 2` |
| 构建产物（`dist/`，本次 2026-10-26 03:29:51–03:29:52 新鲜落盘） | `dist/cli.js` 1,295,211 字节；`dist/cli.js.map` 2,276,391 字节；`dist/server.js` 14,602,444 字节；`dist/server.js.map` 29,489,306 字节 |
| 关键输出（末尾逐字） | `[build] → ./src/entrypoints/cli.tsx ==> dist/cli.js`；`✓ dist/cli.js 构建成功 (2 文件)`；`[build] → ./src/bff/server.ts ==> dist/server.js`；`✓ dist/server.js 构建成功 (2 文件)`；`[build] 全部构建完成`；stderr 0 字节 |
| 说明 | 两个入口（CLI 入口、BFF 服务端）均打包成功；该结果为仓库级构建状态，不属于 consult 八段门禁的组成部分；`dist/` 已被 `.gitignore` 忽略，不作为交付文件提交 |

### 8.2 `web/` 目录 `bun run build`（`web/package.json` `build: tsc --noEmit && vite build`）

| 项 | 实测记录 |
|---|---|
| 执行命令 | `cwd=web`，`C:\Users\lenovo\.bun\bin\bun.exe run build`（链式 `tsc --noEmit && vite build`） |
| 进程退出码 | **1** |
| 链式前半段 | `tsc --noEmit` 通过：vite 进程已启动，stdout 输出 `vite v5.4.21 building for production…` / `transforming…` / `✓ 4192 modules transformed.`（与 §3.4 web 本地 tsc 独立复核 EXIT=0 相互印证） |
| 失败首因（stderr 逐字摘录） | `x Build failed in 12.40s`；`error during build:`；`[vite:load-fallback] Could not load C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\web\src/knowledge/templates/templateCatalog (imported by src/pages/emr-template-management/index.tsx): ENOENT: no such file or directory, open 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\web\src\knowledge\templates\templateCatalog'`；`error: script "build" exited with code 1` |
| 归属判定 | 缺失模块由 **非 consult 页面** `src/pages/emr-template-management/index.tsx` 29 行导入；`web/src/knowledge/templates/` 目录本机不存在。该失败与 consult-agent 前端页面、服务层、三目录测试无关；consult 范围内的 `ConsultAgentChatPage.tsx` 与 `consultAgent.ts` 未出现在错误栈中 |
| 产物状态 | 本次失败运行**未向 `web/dist/` 写入新鲜产物**；现存 `web/dist/` 89 个产物文件时间戳为 2026-09-21 15:25:42，另有 1 个 `favicon.svg` 为 2026-09-16 18:34:31，均属历史遗留旧产物，不代表本次构建成功 |
| 处置 | 本轮不修代码、不补缺失模块；该缺口归 `emr-template-management` / 知识库模板分片后续闭环；本报告 §9 如实标注前端 vite 仓库级构建未闭环 |

---

## 9. 环境硬约束与未闭环项（如实标注，不伪造通过）

以下约束与 `coverage-round1.md` §6、`12-runbook.md` §9 逐字对齐；当前所有测试与覆盖率结论**仅在 DEMO 进程内仓储口径下成立**：

1. **无运行中 PostgreSQL**：本机未启动数据库；380–385 六表（`consult.threads`、`consult.messages`、`consult.documents`、`consult.diagnosis_prescription_drafts`、`consult.audit_trail`、`consult.profile_memory`）未做真实建表 / 连接 / SQL 查询演练；`PostgresConsultRepo` 仅经 mock pool 契约测试（SQL 片段、列清单、蛇形转驼峰、空结果分支、错误透传），不代表真实库表连通或真实查询通过；`src/db/pool.ts` 与共享 `helpers.ts` 动态查询路径未纳入本轮闭环。
2. **无 LLM 凭证**：环境内未配置 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY`；`safeLlm` 仅覆盖离线确定性降级路径，在线模型请求、响应解析、超时与重试链路未演练；`isAvailable` 在线分支未执行。
3. **未做真实 SSE / HTTP 端到端联调**：未启动真实 HTTP 服务做联调；中途断流、断线重连、超时降级、token 计量与节流均未覆盖；`consultAgentRoutes.ts` 150–154（abort 回调）、160–161（cancel 回调）两条断流回调需在该阶段补覆盖（见 §4.4 4.1-a / 4.1-b）。
4. **未做浏览器视觉走查**：本轮结论不含前端页面渲染、交互走查与视觉回归；按钮显隐、抽屉布局、草稿标签、置信度颜色需在浏览器人工复核。
5. **覆盖率范围边界**：门禁测试仅反映 `tests/unit/consult-agent`、`tests/security/consult-agent`、`tests/integration/consult-agent` 三目录在 DEMO 进程内仓储下的执行情况；`web/` 与其他 B 类后端模块不在本分片口径内。
6. **仓库级构建闭环状态**：根 `bun run build` 本次实测成功（§8.1）；前端 `vite build` 因非 consult 缺失模块失败（§8.2），未作为 consult 门禁段闭环；真实 HTTP 服务启动、页面在线联调不在本轮范围。
7. **旁路服务未验证**：`services-java`（Maven / JVM）、`services-python/radar-inference` 不在本机验证范围。
8. **基线遗留失败用例不计入本轮统计**：F1（`tests/unit/onlineConsult.test.ts`）、F2（`tests/unit/db/ddl.test.ts`）归属与留档见 §7。

---

## 10. 边界与归属

### 10.1 G1–G5 与共享历史债务（本轮未改源码与专属测试）

`git status --porcelain` 逐文件核对，下列文件本轮 **clean（未修改）**：

| 编号 | 文件 | 归属说明 |
|---|---|---|
| G1 | `src/db/pool.ts` | 共享连接池，另一路 B 类后端改动；覆盖率不计 consult 债务（`coverage-round1.md` §5） |
| G2 | `src/security/encryption/FieldCipher.ts` | 共享字段加密组件，不在 consult 分片 |
| G3 | `src/bff/routes/health.ts` | 健康检查路由，另一路 B 类 |
| G4 | `src/bff/routes/imaging.ts` | 影像模块路由，另一路 B 类 |
| G5 | `src/bff/routes/twin3DInpatient.ts` | 住院孪生模块路由，另一路 B 类 |
| — | `web/src/router/index.tsx` | 历史基线债务，不在本轮改写范围 |
| — | `src/bff/server.ts` | 全局装配 / 中间件归属共享基础设施分片；consult 仅经 `withIdempotency`、`auditOperation`、CSRF、鉴权全局中间件引用，不修改其源码 |

另见 `coverage-round1.md` §5 边界文件：`src/bff/config/runtimeEnv.ts`、`src/bff/middleware/auth.ts`、`src/db/pool.ts`、`src/db/repositories/helpers.ts`，本轮覆盖率变化如实记录，不归功于 consult 补测。

### 10.2 B 类品牌旧称与 C 类基线遗留旧称

- B 类品牌旧称：55 命中 / 6 文件；C 类基线遗留旧称：52 命中 / 11 文件。两组归属其他分组，不计 consult 债务（口径见 `baseline-round0.md` §9）；本报告不对该两组命中做复核改写。

### 10.3 隔离对象清单（不得混入 consult 交付树）

下列对象与本轮 consult 交付无关，本轮未读取其内容、未纳入门禁、未计入覆盖率：

- `docs/research/`（电子病历国标规范、开源实践与本地差距三方对标研究，4 个文件，独立提交 `5afe5413`）；
- `reports/consult-rebuild/`（重建期旧探针 PowerShell 脚本 13 个 `.ps1` 与冻结契约、基线勘查档案，属 #30 之前历史物料）；
- `reports/patrol/`（历史巡检简报 21 个 `.md`，含 00:23、00:36、00:46、01:11、02:12、02:24、03:08 等轮次）；
- `probe_m416.txt`（历史探针落盘文本）；
- `web/src/store/cdrQueryV2M636Store.ts`（CDR 查询 V2 M636 状态仓，另一分片）；
- `.env.example`（环境变量样例，属共享配置分片，未纳入 consult 门禁文件清单）。

### 10.4 本轮工作区改动归属（只读 `git status --porcelain` 记录，未执行写操作）

- 跟踪修改 3 个文件：`docs/consult-agent/README.md`（索引更新）、`web/src/pages/consult-agent/ConsultAgentChatPage.tsx`（前端规则债清零与五预留能力接线）、`web/src/services/api/consultAgent.ts`（服务层规则债清零与归一化口径）。
- 未跟踪新增 consult 交付：`docs/consult-agent/08-adr.md` … `13-contract-reconciliation.md` 六篇；`reports/consult-deepen/`（基线档案、覆盖率报告与日志、本轮门禁落档）；`scripts/consult-agent/gate.ps1`；新增测试 11 个（`tests/unit/consult-agent/` 10 个 `.test.ts`、`tests/integration/consult-agent/consultRouteErrors.test.ts`）。
- `src/core/agent/consult/` 26 个 `.ts`、`src/bff/routes/consultAgentRoutes.ts`、`src/db/repositories/consultAgentRepo.ts`、`web/src/services/api/consultAgent.ts`、16 个既有 consult 测试文件已被 git 跟踪；本轮复核未改动其源码与既有 01–07 文档。

---

## 11. 提交与推送状态（§8.6 口径，本轮未执行 git 写操作）

1. **本轮报告撰写时未执行** `git add` / `git commit` / `git push`；本报告除自身 Markdown 文件外，未新增任何 consult 交付文件；`dist/`、`web/dist/`、`coverage/` 为构建产物目录（已被 `.gitignore` 忽略）。
2. 本地 HEAD 实测（`git rev-parse HEAD`）：`dd0f94e58060584acbaafdf73918809be05abd4a`；基线档案记载 HEAD：`d0c2d79756cacd75960bd7563ba8d9b186127270`；两者之间为 `docs(patrol)` / `docs(research)` 巡检与研究文档提交（`cf36b3b3` … `dd0f94e5` 共 12 笔），consult 本轮工作区改动尚未纳入提交。
3. 分组提交规范（`feat/test/docs/chore(consult-agent)`）、仅显式 add consult 深化文件，由后续 #38 环节执行；推送口径：
   - JLMEDAIOS `master`：普通 fast-forward，**禁止 force**；
   - HEAGENTOS `main`：维持 force-main 覆盖口径；
   - GitHub `mirror`：本轮不主动推送，只核对。
4. 在推送完成前，本报告与后续验收材料**禁止**写入任何断言两仓已对齐、镜像已完成同步类的完成性结论；该类结论须在 #38 推送完成、双仓核对后另行落档。

---

## 12. 附录

### 12.1 本轮执行命令清单（仓库根，PowerShell 5.1，Bash 禁用）

```powershell
# 0. 环境前置（脚本内自动装配；手工复跑先设置）
$env:DEMO_MODE = "1"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$env:PATH = "C:\Users\lenovo\.bun\bin;" + $env:PATH

# 1. 一键门禁（八段，含根 tsc、三段 ESLint、本地 ESLint、Prettier、bun 测试、覆盖率）
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/consult-agent/gate.ps1

# 2. 根 TypeScript 独立复核
node node_modules/typescript/lib/tsc.js --noEmit

# 3. web 本地 TypeScript 独立复核（cwd=web）
Set-Location web
node node_modules/typescript/lib/tsc.js --noEmit

# 4. 遗留失败用例隔离复现（不修复、不计入门禁口径）
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/onlineConsult.test.ts
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/db/ddl.test.ts

# 5. 仓库级构建尝试（非 consult 门禁段）
# 5.1 根目录
& "C:\Users\lenovo\.bun\bin\bun.exe" run build.ts
# 5.2 web 目录（cwd=web）
& "C:\Users\lenovo\.bun\bin\bun.exe" run build

# 6. 覆盖率命令（门禁 §7 内部口径）
& "C:\Users\lenovo\.bun\bin\bun.exe" test --coverage --coverage-reporter text tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent
```

### 12.2 日志文件路径清单（仓库内落档）

| 类别 | 路径 |
|---|---|
| 门禁汇总 | `reports/consult-deepen/round1-gate/gate-summary.log` |
| 段 1 根 tsc | `reports/consult-deepen/round1-gate/gate-1-tsc.log`、`gate-1-tsc-err.log` |
| 段 2 后端 ESLint | `reports/consult-deepen/round1-gate/gate-2-eslint-be.log`、`gate-2-eslint-be-err.log` |
| 段 3a 前端 service（根口径） | `reports/consult-deepen/round1-gate/gate-3a-eslint-fe-root-service.log`、`gate-3a-eslint-fe-root-service-err.log` |
| 段 3b 前端 page（根口径） | `reports/consult-deepen/round1-gate/gate-3b-eslint-fe-root-page.log`、`gate-3b-eslint-fe-root-page-err.log` |
| 段 4 前端本地 ESLint | `reports/consult-deepen/round1-gate/gate-4-eslint-fe-local.log`、`gate-4-eslint-fe-local-err.log` |
| 段 5 Prettier | `reports/consult-deepen/round1-gate/gate-5-prettier.log`、`gate-5-prettier-err.log` |
| 段 6 bun 测试 | `reports/consult-deepen/round1-gate/gate-6-bun-test.log`、`gate-6-bun-test-err.log` |
| 段 7 覆盖率 | `reports/consult-deepen/round1-gate/gate-7-coverage.log`、`gate-7-coverage-err.log` |
| 历史归档 | `reports/consult-deepen/round1-gate/archive/20261026-032253/` |
| 基线档案 | `reports/consult-deepen/baseline-round0.md`、`baseline-coverage-round0.log`、`baseline-bun-consult-round0.log` |
| 本轮覆盖率报告与原始日志 | `reports/consult-deepen/coverage-round1.md`、`coverage-round1.log` |
| 门禁脚本 | `scripts/consult-agent/gate.ps1` |
| 本轮报告（本文件） | `reports/consult-deepen/deepen-round1-report.md` |

> F1 / F2 单文件复跑日志留存于本轮评审工作区 scratch 目录（按纪律未写入仓库 consult 交付树）；其退出码、pass / fail / expect、失败位置与断言摘要已逐字摘录至 §7 表格。

### 12.3 本轮复跑时间戳（Asia/Shanghai，UTC+08:00）

| 事项 | 时间 / 口径 |
|---|---|
| 门禁启动 | 2026-10-26 03:22:53（`gate-summary.log` `TSC_ROOT_START`） |
| 门禁收尾 | 2026-10-26 03:25:03（`gate-summary.log` 末行 `gate done`） |
| 根构建产物落盘 | 2026-10-26 03:29:51–03:29:52（`dist/` 文件时间戳） |
| web 构建失败时点 | 2026-10-26 03:31:38（`web-build` 记录，12.40s 失败） |
| 报告落档日期 | 2026-10-26 |
| bun 版本 | `bun test v1.2.0 (b0c5a765)`（`gate-6-bun-test.log` 首行）；`package.json` `packageManager: bun@1.4.2` 为项目声明口径 |
| Node | 根 `tsc` 独立复核与门禁段 1 均无诊断输出（0 字节） |

### 12.4 自检记录

- 本报告正文六类旧称字面量命中 **0**（扫描方式同 §5 第 10 项；旧称清单仅以「基线档案 §8」引用，不在报告内展开字面量）。
- 报告内门禁数字与 `gate-summary.log`、`gate-6-bun-test-err.log`、`gate-7-coverage-err.log` 逐字一致；覆盖率数字与 `coverage-round1.md` §1.3、§2、§3.1 逐字一致。
- 报告内不含密码、token、内嵌凭据；不引用任务边界外的兄弟工作区路径。
- 本报告未修改 `src/`、`tests/`、`web/` 源码与既有 01–07 文档；除本报告 Markdown 外未新增 consult 交付文件；未执行任何 git 写操作。
- 证据位置均可指向仓库内真实存在的文件或本轮落档日志；§7 F1 / F2 复跑日志路径已在 §12.2 末条说明归属。

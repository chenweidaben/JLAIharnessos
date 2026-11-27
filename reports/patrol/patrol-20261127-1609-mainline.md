# 巡检简报 2026-11-27 16:09 轮（路由层 console.error 批量迁 rootLogger · Provider 工厂用例 try/finally 收紧 · 隔离 env 覆盖度核查闭环 · 门禁双 0）

## 概要
本轮在干净基线 `8fecad96`（三远端逐字一致、0 领先 / 0 落后、tracked 工作区仅行尾噪音）上续接台账可自主工程债：路由层裸 `console.error` 批量迁既有 `rootLogger` 结构化日志，共 **64 个 routes 文件**；两个 LLM Provider 测试工厂用例的进程级 env 改写由同步还原收紧为 `try/finally`；一处 message 占位 `${deptCode}` 静态串误插值修正；测试隔离 env 还原覆盖度核查闭环（台账 #144）。后端 `tsc --noEmit` 与前端 web typecheck 双 **exit 0**；Provider 组合 **21 pass / 0 fail**；3 个并行串扰下疑似失败的后端 unit 文件单独复跑 **67 pass / 0 fail**。全量 unit 并行批次在 bun 1.2.0 web 误纳段被截断、未产出原生汇总行，未据此编造全量通过结论（详见取证表与遗留项）。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端根 TypeScript 6.0.2；前端 `web/` TypeScript 5.6.3。
- 起点 HEAD：`8fecad9638b28afd5f1135cc5d9d86876c241c7a`；三远端（origin / gitcode / mirror）`refs/heads/consult-agent-m86` 逐字一致，0 领先 / 0 落后。

## 专项① 路由层 console.error → rootLogger 结构化（64 文件）
迁移目标：`src/core/logging/Logger.ts` 导出的 `rootLogger`（debug/info/warn/error/critical 五级，`error(message, fields: Record<string, unknown>)`，`child()` 带子上下文）。

- **导入口径**：`import { rootLogger } from '../../core/logging/Logger.js';`（带 `.js` 后缀），插在最后一个 import 之后；`internetHospital.ts` 原已有该导入，未重复添加。
- **错误对象取值**：`error`（message 文本）与 `stack` 两字段双路取值 `err/e instanceof Error ? ... : String(err)`；Error 不可枚举 message/stack，禁止只传错误对象、禁止 any 兜底。
- **公共上下文**：每条 `rootLogger.error` 带 `method: c.req.method`、`url: c.req.url`、`traceId: c.traceId`；业务字段按路由补充（museAdmin/museHome/musePharma `staffId: resolved.staffId`、museNurse `nurseId: resolved.nurseId`、museDeptCurve `deptCode`、nurseMuse `staffId`、patientMuse `patientId`、doctorMuse/museGrowth 局部 `staffId`、museMonthlyReport `year/month`；集成/党建等无业务字段路由仅带公共底字段）。
- **模板分组**：err 变量组（模板 A，catch 标准）与 e 变量组（模板 B，集成/党建）两类；`json(fail/ok)` 业务返回、注释、权限校验、`instanceof` 判断、回退演示逻辑均未改动。
- **占位修正**：`museDeptCurve.ts` message 在单引号静态串内残留字面 `${deptCode}`（不做运行时插值），已改为静态路由描述 `'[museDeptCurve] GET /dept-curve 失败'`，`deptCode` 走 fields。
- **收口 Grep**：routes 目录业务 `console.error` 残留 **0**；保留项与既有清单一致——`auditEvents.ts:70`（审计链）1 处 error；4 处 warn（`adminBackup.ts:100`、`assistantLlmChat.ts:113`、`cryptoSignature.ts:46`、`doctorPreference.ts:87`）待下一批甄别；`codeQuality.ts:12`、`notifyConfig.ts:78` 为注释文案非调用。

## 专项② Provider 工厂用例隔离收紧（2 文件，try/finally）
- `tests/unit/core/BailianProvider.test.ts`：工厂用例 for 循环改写 `LLM_PROVIDER` / `DASHSCOPE_API_KEY`，原末尾同步还原无 `finally`，expect 失败会跳过还原导致 env 泄漏；改为 `try/finally`，finally 内逐键还原。
- `tests/unit/core/DeepSeekProvider.test.ts`：工厂用例改写 `LLM_PROVIDER` / `LLM_API_KEY`，原无 `finally` 无 `afterEach`；同样收紧为 `try/finally` 还原。
- 复核：两文件组合 **21 pass / 0 fail / 79 expect**，exit 0。

## 专项③ 测试隔离 env 还原覆盖度核查（#144 闭环）
- 扫出 tests 内 18 个改写进程级 env 的文件，逐个核查还原钩子：**16 个覆盖完整**（afterEach / try-finally / beforeEach 重置兜底）；仅上述 2 处工厂用例薄弱，已在专项②收紧。
- 已覆盖文件含：auditEventStore、backfillTruncation、demoModeGuard、prodDemoFailClosed、consultAgentRepo、safeLlm、sessionRuntime、BailianProvider、DeepSeekProvider、globalRateLimit、keyOpsStore、medmusePersist、wormArchive、wormKeyProvider、wormKeysRoutes、ai-interpretation(integration)、mockScope、testEnv。

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit`（TS 6.0.2） | 0 error | 0 error | **0** |
| 前端 `bun run --cwd web typecheck`（TS 5.6.3） | 0 error | 0 error | **0** |
| Provider 组合（Bailian + DeepSeek） | — | 21 pass / 0 fail / 79 expect | **0** |
| 并行串扰疑似失败 3 文件单独复跑（wormArchive / LLMClient / monitoring） | — | 67 pass / 0 fail / 214 expect | **0** |
| unit 全量 | 16677 pass / 163 fail / 113 errors（16840 tests / 2247 files，exit 1） | 并行批次在 web 误纳段截断，未产出原生汇总行，未提取对比 | **—** |

- **全量回归如实说明**：本轮全量并行批次输出落 `_rep17_unit_full.txt`（32169 行），bun 进程在 web 目录误纳段（`vi.mock is not a function` / jsdom `hardwareConcurrency` 栈溢出 / navigator 缺失）收尾前被回收，文件尾部无 `Ran N tests` 原生汇总行。并行输出中 3 个后端 unit 文件出现失败标记（wormArchive fs 往返 5297ms 超时、LLMClient 被 jsdom 串扰误判 browser-like、monitoring 尾部 jsdom 栈溢出）；**单独完整路径复跑三文件全部通过**，判定为并行环境串扰偶发，非本轮源码回归。本轮改动仅限 routes 日志块替换与 2 个 Provider 测试钩紧，未触碰 LLMClient.ts、wormArchive、monitoring 源码。
- 存量已知：163 fail + 113 errors 基线全为 bun 1.2.0 web 目录误纳（navigator / localStorage / document / Blob 缺失 + 超时挂起）；全量原生汇总口径待 web 误纳根治（bun ≥1.2.10 前缀锚定）后复跑对齐。

## 红线复核（拍板 / 裁决前未擅动）
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点；审计链 seq 1647 断点复测仍需测试库授权与备份。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **全量原生汇总待补**：web 误纳根治前，全量并行批次难以稳定产出原生汇总行；下一轮低峰串行或降并发复跑后端 unit（排除 web）取原生 pass/fail 与基线逐项对比。
- **console 续迁**：路由层 4 处 warn（adminBackup / assistantLlmChat / cryptoSignature / doctorPreference）甄别保留或迁移；审计 `auditEvents.ts:70` 保留；路由层之外 aggregators / agents / core / integration 残留 console 见 `_rep15_console.md` 179 处总表。
- **死代码分批（#143，未删除）**：248 项清单在 `_rep16_deadcode_ast.md`（A 未使用导入/函数/类型 89、B 未使用局部 const/let 53、C 未使用参数 106）；A 类先排除 re-export / barrel / 动态 / 反射引用，B 类确认无模块级副作用，C 类禁删形参仅可加 `_` 前缀；删除前后跑门禁与受影响测试、零引用证据闭合。
- **隔离延伸**：其余 NODE_ENV / TRUST_PROXY / DATABASE_URL / WORM_* 维持文件内还原；M48-A Windows afterEach pump 根因随 bun 升级复核；长驻演示内存聚合器跨轮残留持续观察。
- **工具链只读方案（不擅自升级）**：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A；web→TS6 先评估 antd5 / React19 / vitest 2.1.8 / typescript-eslint 8.15 兼容矩阵，独立分支取证。
- **未入库产物**：本轮临时留痕（`_rep17_*`）、历史 patrol 切片、schema 备份、lint 扫描 JSON、`docs/TODO_LEDGER.md`、`scripts/_*.py` 不入库；两个 CRLF 噪音 aggregator（lessonRecordAggregator / teachingOnlineAggregator）忽略行尾后无内容差异，未暂存。

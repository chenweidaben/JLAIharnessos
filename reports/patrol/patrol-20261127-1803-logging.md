# 巡检简报 2026-11-27 18:03 轮（保留日志 4 处迁 rootLogger 结构化 · 安全降级告警保留标注 · 门禁双 0 · 核心 83 / 聚合器 98 / 受影响 38 全绿）

## 概要
本轮在干净基线 `0b7c8cde`（三远端逐字一致、0 领先 / 0 落后）上续接台账 #149 保留日志可自主项。按上一轮定性表，将 3 处 `console.warn` 与 1 处 `console.error` 迁至 `rootLogger` 结构化日志，字段沿用既有样例口径（`method` / `url` / `traceId`，错误对象 `error` / `stack` 双路 `err instanceof Error` 取值，禁止 `any` 兜底）；国密降级安全告警 `cryptoSignature.ts:46` 维持 `console.warn` 并补注不迁移理由。后端 `tsc --noEmit` 与前端 web typecheck 双 **exit 0**；受影响 4 文件 **38 pass / 0 fail / 72 expect**，核心 5 文件 **83 pass / 0 fail / 228 expect**，聚合器 10 文件 **98 pass / 0 fail / 428 expect**。全量 eslint：errors **1291 持平基线**，warnings 3438 → **3436**；no-unused-vars **166 持平**。本轮共改动 **5 个 src 文件**（4 处迁移 + 1 处保留告警注释）。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端根 TypeScript 6.0.2；前端 `web/` TypeScript 5.6.3。
- 起点 HEAD：`0b7c8cded7232a18e341cf02b0ffe8c2c12a8b0e`；三远端（origin / gitcode / mirror）`refs/heads/consult-agent-m86` 逐字一致，0 领先 / 0 落后。
- 工作区：本轮真实改动 **5 个 src 文件**；另 2 个 CRLF 噪音 aggregator（lessonRecordAggregator / teachingOnlineAggregator）忽略行尾后内容差异 0 行，不暂存；探针 / 台账 / 历史切片 / `_rep19_*` 留痕均不入库。

## 迁移口径冻结
1. 结构化 `rootLogger` 取自 `src/core/logging/Logger.ts`；`warn(message, fields)` / `error(message, fields)`，fields 缺省 `{}`。
2. 路由上下文字段固定带 `method: c.req.method`、`url: c.req.url`、`traceId: c.traceId`；回调闭包内可访问 `c`。
3. 错误对象双路取值：`error: err instanceof Error ? err.message : String(err)`；`stack: err instanceof Error ? err.stack : undefined`；非 Error 不兜底 `any`。
4. 迁移后移除原 `// eslint-disable-next-line no-console`；新增 `rootLogger` 导入按 simple-import-sort 规则置于 `../../` 组（core 先于 db）。
5. 每处迁移前后过后端 tsc + 受影响测试；eslint 复核确认被迁 `console.*` 清零，新增 lint 违规消除，剩余问题逐条对照基线判定为存量。

## 专项① 4 处日志迁 rootLogger 结构化
| 位置 | 级别 | 迁移后字段 | 说明 |
|---|---|---|---|
| routes/adminBackup.ts | warn | `method` / `url` / `traceId` / `skipped` | 备份旁路部分表导出为空跳过；`skipped` 数组作为结构化业务字段保留，不再 `JSON.stringify` 拼串 |
| routes/assistantLlmChat.ts | warn | `traceId` / `warning`（LLM 警告字符串 `m`） | `onWarning` 回调内透传上游 LLM 警告；回调闭包取 `c.traceId` |
| routes/doctorPreference.ts | warn | `method` / `url` / `traceId` / `doctorId` / `error` / `stack` | fire-and-forget 后台重算异常；错误对象双路取值，附带 `doctorId` 便于定位 |
| routes/auditEvents.ts | error | `method` / `url` / `traceId` / `error` / `stack` | 审计查询路由 catch 失败日志；非审计链写入留痕本身，不视为哈希链动作 |

## 专项② 保留告警（刻意不迁结构化）
- **routes/cryptoSignature.ts:46**：国密密码学降级告警——sm-crypto 加载失败回退 sha256 占位 SM3。维持 `console.warn`，补注：安全降级事件需在控制台显著保留，避免被结构化聚合掩盖；待 TODO 落地真实国密 SDK（HSM / USBKey / 合规商密）后再一并评估日志口径。本轮未改动其告警行为。

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit`（TS 6.0.2） | 0 error | 0 error（两轮复核） | **0** |
| 前端 `bun run --cwd web typecheck`（TS 5.6.3） | 0 error | 0 error | **0** |
| 受影响 4 文件（logging / audit / audit-report / LLMClient） | — | 38 pass / 0 fail / 72 expect | **0** |
| 核心 5 文件（SessionManager / departmentOperationAnalysis / expression / ToolExecutor / knowledgeRegistry） | 83 / 0 / 228 | 83 pass / 0 fail / 228 expect | **0** |
| 聚合器 10 文件（costAttribution / labInterpretation / patientBilling / research / securityRecheck / smartTriage / QueryEngine / prescriptionAudit / realInvoker / chat） | 98 / 0 / 428 | 98 pass / 0 fail / 428 expect | **0** |
| 全量 eslint `src` | 4729 problems（1291 errors / 3438 warnings） | 4727 problems（**1291 errors 持平** / 3436 warnings） | **1**（存量规则） |
| no-unused-vars 清单 | 166 | **166 持平**（args 106 未动） | — |

- **error 存量对照**：迁移文件复核出的 1 个 error（auditEvents.ts:125 `no-unnecessary-type-assertion`，`c.body()` 断言）对照改动前基线为存量（基线 118 行，仅因导入下移漂移），本轮未引入新 error；cryptoSignature:34 unused eslint-disable 为存量 warning。
- **新增 lint 违规处置**：doctorPreference 基线干净，首轮插入导入后触发 1 条 simple-import-sort warning，已 `eslint --fix` 仅排该文件导入顺序并 diff 核对只动导入块；adminBackup / assistantLlmChat / auditEvents 首行 sort warning 为存量 `../` 组内部乱序，基线既有，本轮未扩大。
- **console 残留**：4 个迁移路由 `console.*` 计数均为 0；cryptoSignature 保留 1 处 `console.warn`（定性保留）。
- **测试隔离核查**：本轮改动 5 文件 Grep `process.env =` 写入 **0 命中**，未新增进程级 env 改写缺口；NODE_ENV / TRUST_PROXY / DATABASE_URL / WORM_* 还原钩子维持 #144 结论。
- **未跑全量 unit**：当前非低峰，全量并行批次在 bun 1.2.0 web 误纳段易被回收、无原生汇总行；留待低峰串行复跑取原生 pass/fail。

## 本轮未纳入、保留待后续批次（接台账 #143）
- **B 类模块级常量表 / 状态 `let`（38 项 vars-assigned）**：含 ABNORMAL_KINDS、SPEC_BY_KEY、NEXT_STATUS、IRRATIONAL_LABEL、PRAISE_LEXICON、SUPPORTED_TYPES、ORDER_TYPES、SPECIAL_BASE_COLS、LIST_FIELDS 等映射表；删除前须确认无动态字符串索引 / 闭包 / 事件 / 定时器 / 外部读取 / 再导出；lastCheckedAt / oldKey / key 等状态 `let` 连同赋值点一并清理；settlementAnalyticsRepo 模块级 `db = getDb()` 复核连接获取副作用。
- **A 类本地定义死函数（17 个）**：先排除路由表注册、事件订阅、反射 / 字符串调用、barrel 再导出，确认零引用后再删。
- **前端 `.tsx` 未使用项 12 处**：走 web typecheck + eslint 复核，排除 JSX 同名绑定后清理。
- **C 类未使用参数 106 项**：接口契约签名，禁删形参；仅在可同步改签名的内部函数加 `_` 前缀。
- 明细指针：`_rep19_unused.csv`（165 项结构化清单）；改动后全量 eslint `_rep19_eslint_after.txt`；改动前基线 `_rep18_eslint.txt`；历史分级 `_rep16_deadcode_ast.md`；console 明细 `_rep15_console.md`。

## 红线复核（拍板 / 裁决前未擅动）
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点；审计链 seq 1647 断点复测仍需测试库授权与备份。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **全量原生汇总待补**：低峰串行或降并发复跑后端 unit（排除 web）取原生 pass/fail，与基线 16677 / 163 / 113 逐项对比；复核 wormArchive / LLMClient / monitoring 三文件串行稳定性，若仍复现须定位根因，不得判偶发了之。
- **工具链只读方案（不擅自升级）**：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A Windows afterEach pump 根因；web→TS6 先评估 antd5 / React19 / vitest 2.1.8 / typescript-eslint 8.15 兼容矩阵，独立分支取证。
- **Python 测试**：本机缺 pytest / fastapi / httpx 且无 venv，仅 py_compile 通过，待具备依赖环境复跑，严禁伪造 pytest 通过。
- **未入库产物**：本轮临时留痕 `_rep19_*`（eslint 基线/复核、tsc、unit、CSV、备份）、历史 patrol 切片、schema 备份、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`scripts/_*.py` 不入库；2 个 CRLF 噪音 aggregator 未暂存。

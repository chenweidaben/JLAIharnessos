# 巡检简报 2026-11-27 19:01 轮（死代码 A 类本地私有死函数 / 未用导入成员 · 14 项零引用删除 · 门禁双 0 · 基线 181 pass）

## 概要
本轮紧接 `caf536d9`（第二批 3 死函数）收口，续接台账 #143 死代码可自主项，清零 A 类剩余 14 个本地定义、零引用的私有符号（13 个本地私有函数 + 1 个未用导入成员）。每项先在本文件内词边界复核调用点、确认非 `export`、无 barrel 再导出、无字符串 / 反射 / 动态调用；路由 handler 另核对路由表挂载与主路由承接，同名符号在其他文件均为各自本地副本，互不引用。删除后连带依赖（常量、类型、其他归约 / 守卫、repo 侧导出）仍被在用路径引用，保留未动。后端 `tsc --noEmit` 与前端 web typecheck 双 **exit 0**；受影响 10 文件 **131 pass / 0 fail / 509 expect**；核心 + 聚合器基线 15 文件 **181 pass / 0 fail / 656 expect**。全量 eslint：errors **1291 持平基线**，warnings 3433 → **3419**；no-unused-vars 163 → **149**（args 106 契约形参未动，vars 57 → 40）。本轮改动 **14 个 src 文件**。

## 工具链与现场基线
- Node v22.23.2 / Bun 1.2.0；后端 TS 6.0.2；前端 `web/` TS 5.6.3。
- 本轮起点 HEAD：`caf536d9c7ba3651648c23bec359cbcf3494ef42`（上一批 3 死函数，三远端 0/0）。
- 工作区：本轮真实改动 14 个 src；2 个 CRLF 噪音 aggregator（lessonRecord / teachingOnline）忽略行尾后内容差异 0 行，不暂存；探针 / 台账 / 历史切片 / `_rep19_*` 留痕均不入库。

## 删除项证据闭合
| # | 文件 | 删除符号 | 类型 | 零引用证据 | 连带保留 |
|---|---|---|---|---|---|
| 1 | aggregators/inpatientAssistantAggregator.ts | `maxLevel(a,b)` | 本地私有归约 | 本文件仅定义行、无调用；非 export；全仓其他 `maxLevel` 为字段 / 局部变量 / 他文件独立函数 | `LEVEL_RANK` 在 408 行另一处归约仍在用，保留 |
| 2 | aggregators/medicalRecordDeepAggregator.ts | `round2` | 本地私有函数 | 本文件仅定义行、无调用；非 export | 同文件 `round3` 在 247/303/478-481 多处在用，保留 |
| 3 | aggregators/pharmacyMgmtAggregator.ts | `isAntibiotic(drugNames)` | 本地私有函数 | 本文件仅定义行、无调用；非 export；全仓其他 `isAntibiotic` 为对象字段名或 outpatientAggregator 局部 const | `isSpecialAntibiotic` 在 543 行调用、162 行接口字段，保留 |
| 4 | aggregators/qualityGateAggregator.ts | `baseScoreOf(status)` | 本地私有函数 | 本文件仅定义行、全仓仅定义行零引用；非 export | `GateStatus` 类型 11 处引用，保留 |
| 5 | db/repositories/risRepo.ts | `numOrNull` | 本地私有函数 | 本文件仅定义行、无调用；非 export | lisRepo / bloodQualityRepo 同名副本各自独立在用，不受影响 |
| 6 | knowledge-platform/processing/pipeline.ts | `sectionPathAt` | 本地私有函数 | 本文件仅定义行、全仓仅定义行零引用；非 export | `ParsedDocument` 类型 / `splitBySections` 在用，保留 |
| 7 | knowledge/processing/TextSplitter.ts | `matchDrugSection(text)` | 本地私有函数 | 本文件仅定义行、全仓仅定义行零引用；非 export | 常量 `DRUG_LABEL_SECTIONS` 在 104 行仍在用，保留 |
| 8 | bff/notify/notifyChannels.ts | `isDemoMode()` | 本地私有函数 | 本文件仅定义行、无调用；非 export；全仓其他 `isDemoMode` 为导出函数 / 局部 const / 他文件独立副本，互不引用 | `memoryConfig` / `cloneConfig` 在用，保留 |
| 9 | aggregators/infectionDashboardAggregator.ts | 导入成员 `listByDepartment` | 未用导入绑定 | 本文件仅导入行、无调用；repo 侧导出函数保留 | 同块 `listByMonth`(2) / `submitMetric`(3) / `InfectionMetric`(3) 在用，保留 |
| 10 | routes/cryptoAssessCn.ts | `isAssessDomain(v)` | 本地私有类型守卫 | 本文件仅定义行、全仓仅定义行零引用；非 export | `isAssessStatus` 在用(2)；`AssessDomain` 类型 7 处引用，保留 |
| 11 | routes/m210Routes.ts | `handleOutpatientQueue` | 本地私有路由 handler | 路由表 149-158 未挂载；151 行注释明示 `/outpatient/queue` 由 routes/outpatient.ts 主路由承接；全仓无 import | 主路由 `outpatient.ts:159` 承接端点；其余 handler 在用 |
| 12 | routes/m257Routes.ts | `handleOutpatientQueue` | 本地私有路由 handler | 路由表 115-122 未挂载；120 行注释明示主路由承接；全仓无 import | 同上，主路由承接；`handleInpatientWards` 等在用 |
| 13 | routes/m551Routes.ts | `notFound(kind,id)` | 本地私有辅助函数 | 本文件仅定义行、无调用；非 export；全仓其他 `notFound` 为字段 / 局部 const / 他文件独立副本 | `json` / `ok` 导入其余 handler 在用，保留 |
| 14 | routes/m581Routes.ts | `notFound(kind,id)` | 本地私有辅助函数 | 本文件仅定义行、无调用；非 export；同名符号干扰已逐文件排除 | `json` / `ok` 导入其余 handler 在用，保留 |

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit` | 0 error | 0 error | **0** |
| 前端 `bun run --cwd web typecheck` | 0 error | 0 error | **0** |
| 受影响 10 文件（infectionDashboard×2 / inpatientAssistant / medicalRecordDeep / pharmacyMgmt×2 / qualityGate×3 / researchPipeline / TextSplitter） | — | 131 pass / 0 fail / 509 expect | **0** |
| 核心 5 + 聚合器 10 基线 15 文件 | 181 / 0 / 656 | 181 pass / 0 fail / 656 expect | **0** |
| 全量 eslint `src` | 4724 problems（1291 errors / 3433 warnings） | 4710 problems（**1291 errors 持平** / 3419 warnings） | **1**（存量规则） |
| no-unused-vars | 163（args 106 / vars 57） | **149**（args 106 未动 / vars 40，-17） | — |

- **error 存量对照**：本轮未引入新 error；14 个改动文件在全量 eslint 中无残留 `no-unused-vars` 告警。
- **测试隔离核查**：14 个改动文件 `process.env =` 写入 Grep **0 命中**；未新增进程级 env 改写缺口。
- **路由端点复核**：m210 / m257 两个停用的 queue mock handler 删除后，`/api/v1/outpatient/queue` 仍由 `routes/outpatient.ts:159` 主路由提供（返回含 encounterId 的数组），前端可达端点无缺口。
- **直接单测**：被删符号均为本地私有未导出，测试不可能直接 import；受影响聚合仓经对应 unit 文件回归覆盖，基线 15 文件回归确认无传导回归。

## 本轮未纳入、保留待后续批次（接台账 #143）
- **B 类模块级常量表 / 状态 `let`（38 项 vars-assigned）**：ABNORMAL_KINDS、SPEC_BY_KEY、NEXT_STATUS、IRRATIONAL_LABEL、PRAISE_LEXICON、SUPPORTED_TYPES、ORDER_TYPES、SPECIAL_BASE_COLS、LIST_FIELDS 等映射表；删除前确认无动态字符串索引 / 闭包 / 事件 / 定时器 / 外部读取 / 再导出；`settlementAnalyticsRepo` 模块级 `db = getDb()` 复核连接获取副作用，不得误删共享连接；`lastCheckedAt` / `oldKey` / `key` 等状态 let 连同赋值点清理。
- **前端 `.tsx` 未使用项 12 处**：LabResultPanel / MedicalRecordViewer / OrderListPanel×2 / PatientInfoBar / StatusLine / CommandPalette / DepartmentManagementScreen / WardRoundScreen 等；走 web typecheck + eslint 复核，排除 JSX 同名绑定后清理。
- **C 类未使用参数 106 项**：接口契约签名，禁删形参；仅在可同步改签名的内部函数加 `_` 前缀。
- 明细指针：`_rep19_unused.csv`；改动后全量 eslint `_rep19_eslint_dead3.txt`；改动前存量对照 `_rep18_eslint.txt`。

## 红线复核
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审；审计链 seq 1647 断点复测待测试库授权与备份。

## 遗留阻塞与待办
- 全量原生汇总待低峰串行复跑；wormArchive / LLMClient / monitoring 三文件串行稳定性待复核，仍复现须定位根因，不得判偶发了之。
- 工具链只读方案（不擅自升级）：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A Windows afterEach pump 根因；web→TS6 先评估 antd5 / React19 / vitest 2.1.8 / typescript-eslint 8.15 兼容矩阵，独立分支取证。
- Python 测试本机缺 pytest / fastapi / httpx 且无 venv，仅 py_compile 通过，严禁伪造 pytest 通过。
- 未入库产物：`_rep19_*` 留痕、历史 patrol 切片、schema 备份、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`scripts/_*.py`；2 个 CRLF 噪音 aggregator 未暂存。

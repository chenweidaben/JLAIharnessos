# 巡检简报 2026-11-27 19:34 轮（死代码 B 类模块级常量表 + 纯局部未用变量 · 18 项零引用清理 · 门禁双 0 · 基线 181 pass）

## 概要
本轮紧接 `5fbe8e78`（A 类 14 项清零）收口，续接台账 #143 B 类可自主项，清理 18 个本文件零引用、无外部副作用的未用绑定：11 个模块级死常量表 + 7 个纯局部未用变量（含 1 个 for-of 解构占位、1 个连带纯函数）。每项先在本文件词边界复核定义/调用计数、全仓 Grep 排除外部 import / 再导出 / 字符串 / 反射 / 动态索引；连带类型、在用常量、repo 侧导出经复核仍被引用，保留未动。后端 `tsc --noEmit` 与前端 web typecheck 双 **exit 0**；受影响 16 文件 **270 pass / 0 fail / 871 expect**；核心 + 聚合器基线 15 文件 **181 pass / 0 fail / 656 expect**。全量 eslint：errors **1291 持平基线**，warnings 3419 → **3401**；no-unused-vars 149 → **131**（args 106 契约形参未动，vars 40 → 22，-18，与清理项一一对应）。本轮改动 **18 个 src 文件**。

## 工具链与现场基线
- Node v22.23.2 / Bun 1.2.0；后端 TS 6.0.2；前端 `web/` TS 5.6.3。
- 本轮起点 HEAD：`5fbe8e788f136e94715f99474ade33e2875e5db1`（A 类 14 项，三远端 0/0）。
- 工作区：本轮真实改动 18 个 src；2 个 CRLF 噪音 aggregator（lessonRecord / teachingOnline）忽略行尾后内容差异 0 行，不暂存；探针 / 台账 / 历史切片 / `_rep19_*` 留痕均不入库。

## 第一批：模块级死常量表（11 项，纯字面量 / 纯数据结构）
| # | 文件 | 删除符号 | 类型 | 零引用证据 | 连带保留 |
|---|---|---|---|---|---|
| 1 | agents/agentAdmission.ts | `ABNORMAL_KINDS` | 模块级 `readonly AbnormalKind[]` | 本文件 + 全仓仅定义行；非 export | `AbnormalKind` 类型被 `emptyAbnormalCounts` 等在用，保留 |
| 2 | aggregators/opsAnalysisAggregator.ts | `SPEC_BY_KEY` | `Record<string, MetricSpec>`（Object.fromEntries） | 本文件 + 全仓仅定义行 | `OPS_METRIC_CATALOG`(113/222/311/427)、`MetricSpec`(104) 在用，保留 |
| 3 | aggregators/patientPortalV2Aggregator.ts | `METHODS` | `readonly PaymentRecord['method'][]` | 本文件仅定义行；全仓其他 `METHODS` 为 apiGateway / authMock 独立副本在用 | `REPORT_TYPES` / `CHANNELS` 在用，保留 |
| 4 | aggregators/patientServiceAggregator.ts | `NEXT_STATUS` | `Readonly<Record<ServiceStatus,...>>` 状态机边表 | 本文件仅定义行；全仓 `NEXT_STATUS` 另有 disputeAggregator 独立在用(287)，互不引用 | `ServiceStatus` 类型(122/137 等 3 处)、`SLA_WINDOW_MS` 在用，保留 |
| 5 | aggregators/pharmacyMgmtAggregator.ts | `IRRATIONAL_LABEL` | `Record<IrrationalType,string>` 中文映射 | 本文件 + 全仓仅定义行 | `IrrationalType`(122/137/378/448)、`PREGNANCY_CONTRAINDICATED`(383) 在用，保留 |
| 6 | aggregators/satisfactionLoopAggregator.ts | `PRAISE_LEXICON` | `readonly string[]` 词典 | 本文件 + 全仓仅定义行 | `ROOT_CAUSE_LABEL` 在用，保留 |
| 7 | prompt/schemaGuard.ts | `SUPPORTED_TYPES` | `as const` 类型名数组 | 本文件 + 全仓仅定义行；`checkType` 以 switch 字面量判定，未引用本表 | `isPlainObject` 等在用，保留 |
| 8 | routes/m570Routes.ts | `ORDER_TYPES` | `OrderType[]` | 本文件仅定义行；全仓 `ORDER_TYPES` 另有 orderCpoeAggregator / constants-medical 独立导出在用，互不引用 | `OrderType` 类型被 `OrdRecord.orderType` 在用，保留 |
| 9 | db/repositories/amsRepo.ts | `SPECIAL_BASE_COLS` | SQL 列模板字符串 | 本文件仅定义行；未拼入任何查询 | `SPECIAL_COLS` / `SPECIAL_FROM` 在用，保留 |
| 10 | knowledge/cds/RuleEvaluator.ts | `LIST_FIELDS` | `new Set([...])` 列表字段集 | 本文件仅定义行；类内 122-133 以 switch 硬编码取值，未引用该 Set | 类方法与字段分支在用，保留 |
| 11 | routes/aiIcuMonitor.ts | `ventilatorModes` | 纯模式名数组 | 本文件仅定义行；`demoBeds` 以字面量 `ventilatorMode` 装配，未引用 | `demoBeds` / `genTrends` 在用，保留 |

## 第二批：纯局部未用变量（7 项，RHS 无副作用、非形参、非安全状态）
| # | 文件 | 删除符号 | 形态 | 零引用 / 副作用证据 | 连带保留 |
|---|---|---|---|---|---|
| 12 | emergency/scoring.ts | `reasons` | 局部 `string[] = []` | 仅定义行；函数内 `level1/level2/level3` 各自 push，`reasons` 从未 push / 读取 | `news2` / `complaintLevel` 等在用 |
| 13 | agents/inpatient/documentTemplates.ts | `template` | 局部索引绑定 | 仅 136 行定义未读；111 行另一函数的 `template` 在用，互不干扰 | `DOCUMENT_TEMPLATES`(50/97/111) 在用，保留 |
| 14 | aggregators/nurseMuseAggregator.ts | `endMonth` | 局部 `new Date(endMs)` 纯构造 | 仅定义行；循环条件用 `endMs` 而非 `endMonth` | `cursor` / `guard` 在用 |
| 15 | aggregators/smartScheduleAggregator.ts | `staffById` | 局部 `new Map(staff.map(...))` 纯构造 | 仅定义行；`staff` 入参他处仍在用（未删参数） | `workByWeek` / `nightByWeek` / `bump` 在用 |
| 16 | aggregators/ragTuningV5Aggregator.ts | `totalRetrievals` | 局部 `chunks.reduce` 纯归约 | 仅定义行；后续用 `hits` / `avgHitRate` | `hits` 等在用 |
| 17 | aggregators/patientLabExplainAggregator.ts | `key` | for-of 解构未用变量 | 仅解构首项未读；改为 `[, val]` 占位，`val` 在用 | `ITEM_KNOWLEDGE` 在用 |
| 18 | aggregators/patientServiceDeepAggregator.ts | `seed` + 连带纯函数 `seedOf` | 局部绑定 + 仅被其调用的私有哈希 | `seed` 仅定义行；`seedOf` 全仓仅本文件定义 + 286 调用，无测试引用；纯字符串哈希无副作用，连带删除 | `maskPatientId` / `toText` 在用 |

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit` | 0 error | 0 error | **0** |
| 前端 `bun run --cwd web typecheck` | 0 error | 0 error | **0** |
| 受影响 16 文件（scoring / documentTemplates / nurseMuse / smartSchedule / ragTuningV5 / patientLabExplain / patientServiceDeep / opsAnalysis / patientPortalV2 / patientService / satisfactionLoop / pharmacyMgmt×2 / agentAdmission / schemaGuard / RuleEvaluator） | — | 270 pass / 0 fail / 871 expect | **0** |
| 核心 5 + 聚合器 10 基线 15 文件 | 181 / 0 / 656 | 181 pass / 0 fail / 656 expect | **0** |
| 全量 eslint `src` | 4710 problems（1291 errors / 3419 warnings） | 4692 problems（**1291 errors 持平** / 3401 warnings） | **1**（存量规则） |
| no-unused-vars | 149（args 106 / vars 40） | **131**（args 106 未动 / vars 22，-18） | — |

- **error 存量对照**：本轮未引入新 error；18 个改动文件在全量 eslint 中无残留 `no-unused-vars` 告警。
- **测试隔离核查**：18 个改动文件 `process.env =` 写入 Grep **0 命中**；未新增进程级 env 改写缺口。
- **SQL / 安全复核**：`SPECIAL_BASE_COLS` 为独立列模板，未被 `SPECIAL_COLS` 引用；本轮未触碰加密 / 脱敏 / 注入防护模块的状态变量（见下保留项）。

## 本轮甄别后保守保留、转入下一批专项（不擅自删除）
- **连接 / 状态副作用待复核**：
  - `settlementAnalyticsRepo.ts` 模块级 `db = getDb()`：`getDb()` 为 pool 单例（`_sql` 复用，未建立连接则 `createClient()`），共享连接持有在 pool 内；本文件函数体未读 `db`，但顶层调用承担单例预热 / 初始化时机职责，删除会改变模块加载期建连时机，**保守保留**，归入连接生命周期专项（#115 已评估过连接池）。
  - 闭包 / 模块级状态：`llmAdapter.lastCheckedAt`、`emrQcPdcaPlanV14.samplePlan`（`buildPdcaPlan` 模块级构建）、`wormArchive.signerKeyId`（SM2 密钥源状态）。
  - 安全 / 加密模块：`KeyManager.oldKey` / `key`、`DesensitizationEngine.enableRestore`、`PromptInjectionGuard.source` —— 须逐行确认赋值 / 读取与密钥轮换 / 还原开关语义后再定，本轮不动。
- **RHS 含 await / 写调用，未用返回值（保留调用、不删绑定语义）**：`adminUserAggregator.target`（`await getUserDetail(id)` 存在性校验）、`chatAggregator.assistantMsg`（`await appendMessage` 落库写）、`pathwayAggregator.enrollment`（`await loadEnrollmentForMutate` 校验）、`deployConfigAggregator.policy`（`generateBackupPolicy()` 调用）。
- **函数形参（C 类契约，禁删形参）**：`amsAggregator.input`、`VendorAHISAdapter.limit`、`musePharma.hh`；仅在可同步改签名的内部函数加 `_` 前缀，本轮未动。
- **其余待核局部**：`demoModeAggregator.doctorCounter`（计数器自增待核）、`patientServiceDeep` 之外的 seed 类、`documentTemplates` 之外的模板索引。

## 本轮未纳入、保留待后续批次（接台账 #143）
- **前端 `.tsx` 未使用项 11 处**：CommandPalette / LabResultPanel / MedicalRecordViewer / OrderListPanel×2 / PatientInfoBar / StatusLine / DepartmentManagementScreen / WardRoundScreen 等；走 web typecheck + eslint 复核，排除 JSX 同名绑定、props 解构与图标动态引用后清理。
- **C 类未使用参数 106 项**：接口契约签名，禁删形参；仅在可同步改签名的内部函数加 `_` 前缀。
- 明细指针：`_rep19_unused.csv`；改动后全量 eslint `_rep19_eslint_b2.txt`；改动前存量对照 `_rep18_eslint.txt`。

## 红线复核
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审；审计链 seq 1647 断点复测待测试库授权与备份。

## 遗留阻塞与待办
- 全量原生汇总待低峰串行复跑；wormArchive / LLMClient / monitoring 三文件串行稳定性待复核，仍复现须定位根因，不得判偶发了之。
- 工具链只读方案（不擅自升级）：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A Windows afterEach pump 根因；web→TS6 先评估 antd5 / React19 / vitest 2.1.8 / typescript-eslint 8.15 兼容矩阵，独立分支取证。
- Python 测试本机缺 pytest / fastapi / httpx 且无 venv，仅 py_compile 通过，严禁伪造 pytest 通过。
- 未入库产物：`_rep19_*` 留痕、历史 patrol 切片、schema 备份、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`scripts/_*.py`；2 个 CRLF 噪音 aggregator 未暂存。

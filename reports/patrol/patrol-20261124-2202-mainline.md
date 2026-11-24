# 巡检简报 2026-11-24 22:02 轮（定时唤醒 · 排班 e2e 内存残留闭环复核 / 限流门控取证与 e2e 隔离钩子 / 断连噪声串行复核 / 迁移链预检归类）

## 概要
定时巡检唤醒后继续收口 `consult-agent-m86` 分支后端专项。本轮按五项遗留推进：①长驻 8080 BFF 清内存后复跑 surgeryWorkflow / selfScheduling 两个排班 e2e，确认为跨轮模块级内存残留、非生产代码缺陷；②非 dev / 非 demo 全局 read 限流实测：中间件桶阈值与生产免流门控由单测闭环，真实受限流 BFF 因 autoMigrate 阻塞于四套待拍板漂移 DDL（+ 独立项 339）无法起服，本轮不擅改表结构；e2e 补运行环境探测隔离钩子，免流实例不再误报触顶 fail；③其余 CONNECTION_ENDED 断连噪声文件低峰串行单跑复核，21 个直连库文件全绿，确认为并发 PG 断连噪声；④四套漂移 DDL 选型仅在 ADR-016 补迁移链预检实测报错证据，不改既有表结构与已上线契约；⑤后端 / 前端 tsc 门禁、相关单测、全量 unit 回归取真实退出码，与基线逐字一致。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest
- 后端 BFF/TS：仓库根 `bun test` + `tsc --noEmit`；前端：`web/` 目录 `tsc --noEmit`
- DB：本地 postgres 常驻 `127.0.0.1:5433/jlmedaios`（trust 无密码）；`public.schema_migrations` 已记账 350 / init 355 个 SQL，未记账 5 个（256 / 339 / 349 / 350 / 369）

## 本轮代码 / 种子 / 测试改动
| 文件 | 类型 | 说明 |
|---|---|---|
| `deploy/postgres/init/194-emr-assessment.sql` | fix(seed) | 3 行种子 `category` 对齐表 CHECK 枚举：`medical_qc_rate` / `header_verified` → `document_quality`，`data_accuracy` → `integration`（原越界值 `quality`） |
| `deploy/postgres/init/10-iam.sql` | fix(seed) | 内置角色种子补 `finance`（财务/医保，ON CONFLICT DO NOTHING）；代码侧 `userView.ts` / `agentRegistry.ts` 早已认可 finance 为正式角色，原角色种子漏注册导致 199 授权外键失败 |
| `deploy/postgres/init/206-medmuse-insurance.sql` | fix(seed) | medmuse_agents 种子 `role_code` `insurance_officer` → `finance`，对齐 `MedmuseRoleCode` 白名单 |
| `deploy/postgres/init/209-medmuse-phase3.sql` | fix(seed) | `listFollowups` 工具 `schema` jsonb 字面量删除一个多余尾部 `}`，修复 `invalid input syntax for type json` |
| `web/src/pages/agent/MedMuseChatPage.tsx` | fix(web) | 医保办角色选项 value `insurance_officer` → `finance`，与后端角色码白名单一致 |
| `tests/integration/globalRateLimit-e2e.test.ts` | test(ratelimit) | 触顶用例前探测 BFF `system/health.demoMode`；demo 免流实例跳过 429 断言、仅验证免流放行，真实受限流模式保留原触顶断言 |
| `docs/adr/016-四套漂移DDL选型待决策.md` | docs(adr) | 补本轮迁移链预检四套漂移首个阻断报错与根因归类（不改表） |

## 专项① 排班 e2e 内存残留复核（已闭环）
- 重启清掉长驻 8080 实例模块级内存 Map 后复跑：
  - `surgeryWorkflow-e2e`：**10 pass / 0 fail**（23 expect，exit 0）；
  - `selfScheduling-e2e`：**10 pass / 0 fail**（18 expect，exit 0）。
- 根因：`selfSchedulingAggregator` 的 `slots` Map / `bookings` 数组、`surgeryWorkflowAggregator` 的 `requests` Map / `roomBookings` 数组均为模块级内存，各自导出 `__resetStore()` 但 server 未暴露 HTTP reset 端点；跨轮残留导致号源 / 时段被前轮占满 409。状态机、排班互斥、预约逻辑读源码核对正确，fail 确系内存残留，非生产代码缺陷。

## 专项② 全局 read 限流验证（中间件门控单测闭环；HTTP 层真实触顶被迁移链阻塞）
### 中间件 / 桶 / 生产门控（单测闭环，exit 0）
- 限流口径（`src/bff/middleware/globalRateLimit.ts`）：GET `/api/v1/*` 每 IP 100/min，其他方法 30/min；超限 429 `code=42900` + `Retry-After`；白名单 `/health /ready /metrics /livez /version /ws/`、精确 `/api/v1/health`、`/api/v1/system/health`、`/api/v1/audit/*`。
- 免流三条件同时成立才放行：`isLocal`（回环）&& `devMode`（`NODE_ENV=development` 或 `DEMO_MODE=1`）&& `noProxy`（`TRUST_PROXY≠1` 且无 `X-Forwarded-For`）。
- 单测 `tests/unit/globalRateLimit.test.ts` + `tests/unit/loginLockout.test.ts`：read 100 / write 30 阈值、白名单、生产（`NODE_ENV=production`）本机仍限流、`TRUST_PROXY=1` 仍限流、伪造 XFF 仍限流，**31 pass / 0 fail，exit 0**。

### HTTP 层真实受限流实测（环境前提阻塞，如实记录）
- 非 demo 模式 `initDatabase` 强制 `verifyDbConnection` + `autoMigrate`，迁移失败 `process.exit(1)`，无跳过迁移开关。本地库经迁移器真实分词逐文件预检：165 个未应用迁移成功落地记账，剩 **5 个阻断**——其中 256 / 349 / 350 / 369 为专项④待拍板漂移 DDL，339 为独立 twin-deep 种子 / 约束项。拍板前不擅改既有表结构与已上线契约，故当前仓库状态下真实非 dev / 非 demo BFF 无法 autoMigrate 全绿起服，HTTP 层 429 实测暂不具备前提。
- e2e 原触顶用例硬断言 429，在 demo 免流实例上必然不触顶（免流命中、桶不计数）。已补环境探测钩子：读到 `demoMode=true` 时仅断言 20 次 GET 全部非 429（验证免流放行），生产模式触顶 + `Retry-After` 仍由单测覆盖。复跑 `globalRateLimit-e2e`：**4 pass / 0 fail，exit 0**。

## 专项③ CONNECTION_ENDED 断连噪声串行复核（21 文件全绿，确认为并发噪声）
- 上轮真实模式全量基线 51 fail 已逐项归类。本轮低峰单进程串行复跑 21 个直连 PG 集成文件（`TEST_REAL=1 / DEMO_MODE=0`，每文件独立 bun 进程）：

| 文件 | 结果 |
|---|---|
| erGreenEscalation / escalation / improvementOutcome / improvementTask / inpatientCostMonitor / monitorBudgetBasis / nurseEvalCga / nurseEvalErRehab / nurseEvalNutritionStopbang / nurseEvalRehabPain / nurseEvalSummary / nurseEvalSurgical / nurseStationPicc / patientNotification / postpartumAlert / renewalFlow / satisfactionReminder / settlementAnalytics / settlementReport / transfusionReaction / paymentSelection | 各文件 **0 fail / 0 error / 0 CONNECTION_ENDED**，全部 exit 0，合计 82 pass |

- 结论：上轮 `write CONNECTION_ENDED 127.0.0.1:5433` 为多文件并发跑时 PG 连接被挤断的噪声，串行下不复现；无真实缺陷残留。
- `p07TailLogin-e2e`（打 8080 demo HTTP）：重启清内存后 **6 pass / 0 fail，exit 0**；上轮 fail 为实例内存演示账号 / 限流计数残留前提，非生产缺陷。

## 专项④ 四套漂移 DDL 选型（只取证细化，不改表）
迁移器逐文件预检首个阻断报错（详见 ADR-016 证据表）：

| 编号 | 首个报错 | 根因归类 |
|---|---|---|
| 256 | `column "due_at" does not exist` | `CREATE TABLE IF NOT EXISTS` 跳过已存在旧同名表，新列未落地，索引 / INSERT 引用新列报错；新旧表同名冲突 |
| 349 | `type "clinical.pdca_phase" does not exist` | DO 块按 `pg_type.typname` 不查 schema 判断建类型，clinical 版未生效即被列引用；建类型与列引用顺序 / 分词遗留 |
| 350 | `column "governance_domain" does not exist` | 旧同名表已存在导致 `CREATE TABLE IF NOT EXISTS` 跳过，新列未落地 |
| 369 | `column "dept_code" does not exist` | `ADD COLUMN` 仅补 5 个预测列，未补 `dept_code`，索引 / INSERT 引用报错 |
| 339（独立项，非四套） | 违反 `room_layout_room_type_check` | 种子把 `waiting_area` / `clinic_room` 写入旧 `room_type` 列，非法枚举；待与四套 DDL 一并评估，本轮未改 |

- 红线维持：拍板前不 ALTER / DROP 既有表与列，不改已上线 BFF / 前端契约，不回填历史数据。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 后端 `tsc --noEmit` | **退出码 0**，无类型错误 |
| 前端 `web/ tsc --noEmit` | **退出码 0**，无类型错误 |
| 限流 + 锁定相关 unit（globalRateLimit / loginLockout） | **31 pass / 0 fail**，303 expect，**退出码 0** |
| 全量 `bun test tests/unit` | **16653 pass / 169 fail / 113 errors**，16822 tests / 2245 files，147.81s，**退出码 1**；与上轮基线 **16653 / 169 / 113 逐字一致**，无新增回归（fail / error 集中 web 目录被 Bun 1.2.0 子串匹配误纳与历史遗留） |
| 限流 e2e（demo 免流实例） | **4 pass / 0 fail**，**退出码 0** |
| 21 直连库文件串行复核 | **82 pass / 0 fail / 0 error / 0 CONNECTION_ENDED**，全部 exit 0 |

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **真实受限流 BFF 起服阻塞**：需先完成专项④四套漂移 DDL 拍板落地（含 339 独立项评估），autoMigrate 才能全绿；在此之前 HTTP 层 429 实测无法在本地完成，门控正确性以单测为准。
- **全新环境迁移顺序遗留（未根治）**：本地库 `medmuse_agents` 约束历史已含 finance，但 `200-medmuse-core.sql` 建表旧 CHECK 不含 finance；206 插 finance 早于 209-phase3 约束 DROP/ADD 扩展，全新空库按序跑可能在 206 再次违反约束。本地库因约束已扩展可通过；此顺序问题未改表约束，记待评估。
- **cashier 角色**：`userView.ts` 有权限映射，但 `iam.roles` 种子与各 `role_permissions` 未注册；本轮未触及，未确认是否在后续迁移文件授权。
- **369 空转**：`ops_metric` 新列 / `v_ops_trend` 视图缺快照回写与调度；**350** 规则引擎仍走旧 `meta.dq_rules / dq_runs / dq_results`，新表 `meta.data_quality_rule` 无 SQL 读写。均待选型拍板后落地。
- 本轮临时预检脚本 / 取证 `.txt` / `.sql` / `.ps1` 与 schema-backup 备份不入库；docs CRLF→LF 历史漂移不纳入提交。

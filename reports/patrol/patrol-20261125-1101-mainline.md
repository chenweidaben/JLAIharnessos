# 巡检简报 2026-11-25 11:01 轮（定时唤醒 · 路由档 A 挂载点甄别闭环 · 全量 unit/真实模式 integration 基线复核 · 审计链残留定位 · 增量静态甄别）

## 概要
本轮在起点基线 `6a2a8d05`（三远端 `consult-agent-m86` 逐字一致、ahead/behind 0/0）上，推进不依赖架构拍板的测试隔离甄别与回归基线复核，生产行为不变、不触碰待拍板表结构与上线契约：①对 09:08 轮只读归类的路由档 A 142 条/138 文件复核测试层隔离挂载点，结论为现有测试体系下无可挂载的 reset 入口，本轮不批量补 reset、不向生产 HTTP 暴露清场端点；②全量 unit 与真实模式 integration 低峰复跑，对照既有基线逐字比对，新增 fail 逐文件独立进程剥离归类；③静态治理仅做增量甄别，存量 any/console/未使用导出维持列待办，不批量重构；④工作区临时探针、扫描件、历史切片按范式不入库。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端 TS 仓库根 `typescript 6.0.2`；前端 `web/` 独立 `typescript 5.6.3`。
- 后端 tsc：仓库根 `node_modules\.bin\tsc.cmd --noEmit`；前端门禁：`bun run --cwd web typecheck`；bun test 传完整文件路径，规避 Bun 1.2.0 位置参数子串误纳 web 目录。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移记账 **350**；`iam.roles` **11**；`agent.workflow_instances` 残留 **0**。
- 起点基线 HEAD：`6a2a8d0581eddaf63319b1e93e4be4d6c6b69a04`（origin / gitcode / mirror 的 `refs/heads/consult-agent-m86` 逐字一致、0/0；远端 `HEAD` 符号指向 `master`，与本轮推送分支无关）。
- 8080 demo 实例：`/health` **200**（DEMO_MODE=1，本轮未重启）。
- 本轮 `src/`、`tests/` 零改动；未向 mainline 写入任何生产/测试代码。

## 专项① 路由档 A 测试隔离挂载点甄别（只读复核，生产零改动）
- 输入清单：09:08 轮只读归类出档 A **142 条 / 138 文件**（去重 141 文件），逐条文件+变量+行号见临时扫描件 `reports/patrol/_scan_routes_mem_20261125-0908.md`。
- 核查结论：这些路由台账在现有测试体系内**不存在测试层 reset 挂载点**，本轮不落地批量 reset，理由取证如下：
  - unit 测试对路由仅做 `xxxRoutes: RouteDef[]` 元数据只读断言（`find(r => r.method/path)` 查 auth）；纯业务下沉到同名 `*Aggregator` 纯函数，状态经参数传递，无模块累积。
  - 全仓测试从路由模块导入的非 RouteDef 写状态符号仅 5 个解析辅助函数（`resolveMuseAdminTarget` / `resolveMuseTargetStaffId` / `verifyDemoPassword` / `resolvePatientMuseTarget` / `buildSmokeResults`），无一落在档 A。
  - 44 个被测试 `Routes.find(...).handle(ctx)` 直调的路由模块逐一比对，均为 billing/consultation/pharmacy/inpatient 等业务主路由、写路径落 DB 仓储，与档 A 交集为 0。
  - e2e 测试是独立进程 `fetch(BASE+path)` 打长驻 8080，bun:test 测试进程不加载、不持有路由模块级台账；长驻进程内存 reset 钩子跨进程不可达。
  - 子串误报已排除：`ai-interpretation.test.ts` 匹配 `routes/imaging` 实为 `imagingInterpret.js`（走 DB），非档 A `imaging.ts`。
  - 抽样本体确认：`emrQcOnlineExamV14.ts` 模块级 `sampleExams` 种子数组在 handler 内 `=[...sampleExams, exam]` 重赋值，纯函数 `submitExam/buildExamReport/gradeExam` 已下沉 aggregator；测试只覆盖纯函数 + RouteDef 元数据。
- 处置：此时批量加 `__resetStore` 无测试调用、徒增生产导出面并逼近"不暴露清场端点"红线，故**本轮不落地**。这些是 demo/短路内存态，长驻 BFF 重启即清空；真实累积残留只在长驻 HTTP 进程，治理路径留待后续持久化改造或同进程 e2e 装配专项。
- 分布备查：141 文件中 65 有配套 aggregator、76 纯路由内联；49 被测试 import（均元数据/纯函数）、92 未被任何测试引用。复核方法与分布见临时件 `reports/patrol/_scan_routes_reset_gap_20261125-1101.md`（前缀 `_scan_`，不入库）。

## 专项② 全量回归基线复核（真实退出码取证）
### 2.1 全量 unit —— 与基线逐字一致，无新增回归
- 实测：**16653 pass / 169 fail / 113 errors**，16822 tests / 2245 files，**退出码 1**。
- 对照基线 **16653 / 169 / 113**：pass / fail / errors 三项逐字一致，**无新增回归**。113 errors 与尾部 fail 同源 Bun 1.2.0 子串误纳 web/storage、session 用例（已知基线噪声）。

### 2.2 全量 integration 真实模式（`TEST_REAL=1` + `DEMO_MODE=0`）
- 实测：**1426 pass / 47 skip / 49 fail**，1522 tests / 170 files，**退出码 1**。
- 对照基线 **1429 pass / 47 skip / 46 fail**：skip 47 一致、文件数 170 一致；pass −3、fail +3。逐文件独立进程剥离归类如下。

**A. 并发连接 / 限流桶污染 —— 独立 bun 进程复跑全绿，非后端缺陷**
全量并发及同进程多文件复用 postgres 连接时，连接 `ending` 后复用触发 `write CONNECTION_ENDED 127.0.0.1:5433`；登录用例并行批次触发登录限流桶（429）。拆为独立 bun 进程后连接池全新建立、限流桶独立，用例全绿：

| 测试文件 | 独立进程结果 | 退出码 |
|---|---|---:|
| satisfactionSurvey.test.ts | 5 pass / 0 fail | 0 |
| patientPortal.test.ts | 3 pass / 0 fail | 0 |
| pharmacy-dispensing.test.ts | 24 pass / 0 fail | 0 |
| reportPush.test.ts | 2 pass / 0 fail | 0 |
| postpartumVisit.test.ts | 6 pass / 0 fail | 0 |
| erTriage.test.ts | 8 pass / 0 fail | 0 |
| event-outbox.test.ts | 11 pass / 0 fail | 0 |
| inpatientMidSettle-e2e.test.ts | 9 pass / 0 fail | 0 |
| multiTenant.test.ts | 12 pass / 0 fail | 0 |
| transfusionWorkflow-e2e.test.ts | 7 pass / 0 fail | 0 |
| improvementTask.test.ts | 4 pass / 0 fail | 0 |
| infectionDashboard.test.ts | 6 pass / 0 fail | 0 |
| nurseEvalCga.test.ts | 3 pass / 0 fail | 0 |
| nurseEvalErRehab.test.ts | 1 pass / 0 fail | 0 |
| nurseEvalNutritionStopbang.test.ts | 3 pass / 0 fail | 0 |
| nurseEvalRehabPain.test.ts | 3 pass / 0 fail | 0 |
| nurseEvalSummary.test.ts | 4 pass / 0 fail | 0 |
| nurseEvalSurgical.test.ts | 3 pass / 0 fail | 0 |
| nurseStation.test.ts | 3 pass / 0 fail | 0 |
| nurseStationWard-e2e.test.ts | 14 pass / 0 fail | 0 |
| pacuRecord.test.ts | 6 pass / 0 fail | 0 |
| settlementDrilldown.test.ts | 3 pass / 0 fail | 0 |
| smartTriage.test.ts | 17 pass / 0 fail | 0 |
| improvementOutcome.test.ts | 4 pass / 0 fail | 0 |
| transfusionReaction.test.ts | 7 pass / 0 fail | 0 |
| p07TailLogin-e2e.test.ts | 6 pass / 0 fail（429 限流桶独立后转绿） | 0 |

- 其余散点（nurseEval 系列、settlement*、improvement*、transfusionReaction、patientNotification、inpatientCostMonitor、monitorBudgetBasis 等）与 05:10 基线 A 类同因，历史串行/独立进程已证绿；本轮全量并发窗口复现 CONNECTION_ENDED，不反复回滚。

**B. DB 审计链历史残留 —— 独立进程仍 fail，非本轮代码引入**
- 涉及 5 条：`forensic-e2e.test.ts` 4 条（取证包 `hashChainValid=false`，首条失败后 packageId 无效，元信息 / JSON / CSV 3 条 404 级联）；`auditEvents-e2e.test.ts` 1 条（`verify-chain 全绿`）。
- DB 取证：`audit.events` 共 **2057** 条，seq **1..2057** 连续；链衔接断点在 **seq 1647**——其 `prev_hash` 指向 seq 1000 的 hash，与前一行 seq 1646 的 hash 脱节。该行时间戳 **2026-11-25 06:09:55**，module `self-scheduling`、action `create`、resource `slots`。
- 时点判定：05:10 基线跑测时链完好（forensic 11 e2e 全绿）；断点 1647 写入于 05:10 之后的历史轮次（06:0x 自排班种子/回填批次），属当时进程内存/DB 链基准未同步即追加事件，prevHash 取到陈旧基准。本轮 `src/tests` 零改动，**非本轮代码缺陷**。
- 独立进程复跑取证：`forensic-e2e.test.ts` 7 pass / 4 fail；`auditEvents-e2e.test.ts` 11 pass / 1 fail，污染剥离后仍复现，与 DB 链状态一致。
- 处置：红线不回填、不改表、不动上线契约；列入测试库审计链数据待办——需清库/重置审计链后该 5 条方转绿，本轮不擅自清表。

### 2.3 门禁与基线对比汇总
| 门禁 | 本轮实测 | 基线 | 退出码 |
|---|---|---|---:|
| 后端 `tsc --noEmit`（仓库根，TS 6.0.2） | 零类型错误 | — | **0** |
| 前端 `bun run --cwd web typecheck`（web TS 5.6.3） | 零类型错误 | — | **0** |
| 全量 `bun test tests/unit` | 16653 / 169 / 113 | 16653 / 169 / 113，逐字一致 | 1（113 errors 全 web 误纳） |
| 全量 integration 真实模式 | 1426 / 47 skip / 49 fail | 1429 / 47 / 46 | 1（污染 44 + 审计链残留 5，见专项②） |

- 结论：未发现本轮代码引入的真实后端缺陷；净 +3 fail 来自并发窗口波动与审计链历史残留，均已归类取证。

## 专项③ 增量静态甄别（不批量重构）
- 上轮两提交 `18fc841c..6a2a8d05` 增量代码行 **134**：代码侧 `: any` / `as any` 命中 **0**、`console.` 代码调用命中 **0**。
- 本轮（11:01）`src/`、`tests/` 零改动，无新增 any / 裸 console / 未使用导出。
- 存量维持列待办、不批量重构：`any` **38** 处、裸 `console.log` **43** 处、约 **1.86 万** 导出符号；未使用导出/死代码需配合编译器未使用项开关与引用图专项处理，纯 grep 引用计数易误删公共 API。

## 专项④ 工作区收口（临时件不入库）
- 不入库：历史探针 `_probe*.sql/.ts`、`_seed_*.sql`、`_sweep*.ps1`、`_serial_rep.ps1`；本轮 `_rep8_*.txt/.ps1/.csv`；`schema-backup-*.sql`；`_scan_*.md`；历史 patrol 切片（20261103–20261117、round1-3）。
- docs 取证日志与 CRLF→LF 历史漂移（`docs/_m23*/*_scan.csv`、`m*-regression.md/result.json` 等 M 批次）甄别后不专门提交。
- 仅本 mainline 简报按豁免命名入库。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **测试库审计链残留待办**：`audit.events` seq 1647 起链脱节（陈旧基准追加）；需在明确的测试库重置/清链窗口处理，本轮不回填、不改表。
- **medical-qc 后端详情视图组装**：响应体扩字段、详情数据权限口径、latestRule 快照来源、issue 字段规范化四项待裁决后落地；本轮未扩接口形状。
- **role_permissions 全量镜像待拍板**：补 36 缺字典码、清 DB 冗余旧码、定运行时事实来源三条件未具备；未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。HTTP 429 实测受迁移链阻断，门控以现有单测为准，未伪造触顶结果。
- **测试隔离待办**：①路由档 A 141 文件台账另开持久化/同进程 e2e 装配专项；②postgres 连接池同进程生命周期隔离（CONNECTION_ENDED 根因）；③登录限流桶在全量并发下的隔离/降噪；④其余长驻演示内存聚合器跨轮残留持续观察。
- **工具链待办**：web 独立 TS 5.6.3 与根 TS 6.0.2 版本对齐需专项评估 antd5/React19/vitest2.1.8/`@types` 兼容回归后再决策；本轮以入口隔离跑通门禁，未升级版本。
- **代码质量待办**：存量 `any` 收窄；生产裸 `console.log` 迁移结构化日志；未使用导出/死代码跨文件扫描；server.ts 剩余不可考注释乱码；postgres 连接池生命周期隔离。
- **文档待裁决**：出参嵌套子字段披露粒度、06/24/29 职责漂移、30 动态只读、角色列契约、空权限语义、预留错误码。

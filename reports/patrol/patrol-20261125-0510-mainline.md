# 巡检简报 2026-11-25 05:10 轮（定时唤醒 · 基线对比复核 · 并发污染串行剥离 · 文档抽查 · 静态治理安全子集）

## 概要
本轮在起点基线 `dd052684`（三远端一致 0/0）上，推进不依赖架构拍板的独立收尾与回归复核：①全量 unit 与真实模式 integration 低峰复跑，对照既有基线确认无新增回归；②全量并发下归为 CONNECTION_ENDED / 并行污染的剩余分组，以单进程串行 / 独立进程复跑取真实退出码剥离；③静态治理仅评估可安全移除项，any 收窄、console 残留、未使用导出等需较大改动者列入待办，不夹带风险批量重构；④抽查工具文档与后端 zod 一致性、编码完整性。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest 2.1.9
- 后端 TS：仓库根 `tsc --noEmit`；前端：`web/ tsc --noEmit`；前端 vitest 传完整文件路径
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移记账 **350** / init **355**；`iam.roles` **11**
- 起点基线 HEAD：`dd052684efc9c3f7bd9c65c647d947c5656ad896`（三远端 origin/gitcode/mirror 逐字一致、ahead/behind 0/0）
- 8080 demo 实例 `/health` 返回 **200**

## 本轮改动
本轮无源码、无业务文档改动。静态治理评估结论为无可在把握内安全移除项；文档抽查未发现需补正的漂移。唯一入库产物为本简报。

## 专项① 全量 unit 基线对比（与既有基线逐字一致，无新增回归）
- 命令：`bun test tests/unit`（默认 demo 模式，preload `TEST_REAL!=='1'` 强制 `DEMO_MODE=1`）。
- 实测：**16653 pass / 169 fail / 113 errors**，16822 tests / 2245 files，**退出码 1**。
- 对照基线 **16653 / 169 / 113**：pass / fail / errors 三项逐字一致，**无新增回归**。
- errors 归属复核：报告中 web 路径行 **114**、`src\` 路径行 **0**；113 errors 仍全部为 Bun 1.2.0 子串误纳的 `web/tests/**` 文件，后端无文件级加载错误（既有 issue #5969，需升级 Bun ≥1.2.10 前缀锚定根治）。

## 专项② 全量 integration 真实模式基线对比 + 并发污染剥离
- 命令：`TEST_REAL=1 DEMO_MODE=0 bun test tests/integration`。
- 实测：**1429 pass / 47 skip / 46 fail**，1522 tests / 170 files，**退出码 1**。
- 对照基线 **1424 / 47 / 51**：skip 47 一致；fail/error 合计由 51 降至 46；pass +5。未发现新增真实后端缺陷。

### 46 fail 归类（串行 / 独立进程取证）
**A. 连接生命周期污染（CONNECTION_ENDED）——单进程独立复跑全绿，非后端缺陷**
全量并发及同进程多文件复用 postgres 连接时，连接被 `ending` 后复用触发 `write CONNECTION_ENDED 127.0.0.1:5433`；拆为独立 bun 进程后连接池全新建立，用例全绿：

| 测试文件 | 独立进程结果 | 退出码 |
|---|---|---:|
| `monitorBudgetBasis.test.ts` | 4 pass / 0 fail | 0 |
| `satisfactionReminder.test.ts` | 5 pass / 0 fail | 0 |
| `transfusionReaction.test.ts` | 7 pass / 0 fail | 0 |
| `postpartumAlert.test.ts` | 5 pass / 0 fail | 0 |
| `improvementTask.test.ts` | 4 pass / 0 fail | 0 |

串行批（同进程内复核，前序文件连接污染解除后转绿）：

| 测试文件 | 串行结果 | 备注 |
|---|---|---|
| `improvementOutcome.test.ts` | 4/0 | 串行全绿 |
| `p07TailLogin-e2e.test.ts` | 6/0 | 历史单独取证亦 6/0 |
| `paymentSelection.test.ts` | 6/0 | 历史单独取证亦 6/0 |
| `renewalFlow.test.ts` | 3/0 | 串行全绿 |
| `inpatientCostMonitor.test.ts` | 3/0 | 串行全绿 |
| `nurseStationPicc.test.ts` | 2/0 | 串行全绿 |
| `patientNotification.test.ts` | 2/0 | 串行全绿 |
| `escalation` / `settlement*` / `nurseEval*` 等 15 文件 | 前序轮串行全绿 | 全量并发下复现 CONNECTION_ENDED，串行已证绿 |

**B. 测试夹具数据残留（非后端业务缺陷，列入待办）**
- `selfScheduling-e2e.test.ts` 2 条：种子用固定日期 `2099-11-10`、固定 `doctorId=D1`，`_seed` 跨轮次追加不清理；本轮库内残留累积，`listSlots` 期望 2 实得 8，CT 号源首约期望 200 实得 409。后端按 date/slotType 过滤与容量判断本身生效，偏差来自夹具未隔离历史残留。
- 根因属测试夹具数据隔离，与 `tests env 模式隔离根治` 同类待办；本轮不擅改测试种子约定。

**C. 历史已知噪声（不阻塞基线结论）**
- `internetDelivery.test.ts` 后台 finalize 写 `workflow_node_records` 触发 23503 外键竞态：用例本体 pass，竞态日志为后台异步噪声，既有已知项。

## 专项③ 静态治理安全子集（本轮无可安全移除项）
- 扫描口径：`src/**/*.ts`，排除 `tests/`、`node_modules/`。
- `any` 命中 **38** 处；裸 `console.log` 文本命中 **43** 处。
- 43 处 `console.log` 甄别：多数为 JSDoc 注释示例与代码质量台账中的文案/类别字符串（`codeQualityAggregator.ts` 内 16 处多为扫描分类与清零计划文案）；真实运行时调用集中在服务启动、迁移器进度、HTTP 访问日志中间件、审计回填等有意可观测输出，**非调试残留，删除会损失启动/迁移/审计可观测性**，本轮不删。
- 未使用导出：后端 `tsconfig` 未开 `noUnusedLocals/noUnusedParameters`；存在工具注册表动态注册、repo 索引、框架反射等非静态引用路径，纯 grep 引用计数易误删公共 API。本轮未批量删除任何导出。
- `any` 收窄、console 结构化改造、未使用导出/死代码跨文件扫描（配合编译器未使用项开关与引用图）列入待办，需专门一轮处理。

## 专项④ 工具文档抽查（39 份，编码与 zod 一致性）
- 编码：39 份 `docs/api/tools/*.md` 扫描 `U+FFFD` 替换字符 **0** 匹配，无编码损坏。
- 覆盖：注册表 `FIRST_BATCH_TOOLS` 共 **39** 工具，文档 39 份一一对应，无缺档。
- 抽样 zod 核对（入参字段/类型/必填/枚举/默认值/权限码/风险等级/只读标记均以后端为准）：
  - `03 get_patient_history`：`patientId` 必填 / `startDate` / `endDate` / `visitType` 枚举（门诊·住院·急诊·手术·全部，默认全部）/ `limit` 1–100 默认 20；出参 `total/visits[]`；权限 `patient:read`、low、只读。**一致**。
  - `16 get_lab_result`：`patientId` 必填 / `encounterId` 可选 / `testType` / `itemName` / `startDate` / `endDate`；出参 `reports[]/criticalValues[]`；权限 `lab:read`、low、只读。**一致**。
  - `36 hl7_message_send`：`messageType` enum(ADT/ORM/ORU/MDM) / `messageTrigger` enum(A01/A04/O01/R01/T01/T02) / `messageContent` 对象七可选元素 / `targetSystem` enum(HIS/LIS/PACS/EMR)；权限 `integration:write`、medium、非只读。**入参与权限一致**；出参未列 `status/responseTimeMs/messagePreview` 属出参嵌套子字段披露粒度裁决档，按红线不补。
- 未发现字段/枚举/必填漂移；裁决档（06/24/29 职责漂移、30 动态只读、出参子字段粒度、角色列契约、空权限语义、预留错误码）维持不动。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 | 退出码 |
|---|---|---:|
| 后端 `tsc --noEmit`（仓库根） | 零类型错误 | **0** |
| 前端 `web/ tsc --noEmit` | 零类型错误 | **0** |
| 全量 `bun test tests/unit` | 16653/169/113，与基线一致 | 1（113 errors 全 web 误纳） |
| 全量 integration（真实模式） | 1429/47 skip/46 fail，无新增真实缺陷 | 1（污染/夹具残留，见专项②） |

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **medical-qc 后端详情视图组装**：响应体扩字段、详情数据权限口径、latestRule 快照来源、issue 字段规范化四项待裁决后落地；本轮未扩接口形状。
- **role_permissions 全量镜像待拍板**：补 36 缺字典码、清 DB 冗余旧码、定运行时事实来源三条件未具备；未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。HTTP 429 实测受迁移链阻断，门控以现有单测为准，未伪造触顶结果。
- **测试隔离待办**：①postgres 连接池在同进程多文件 / 并发下被 `ending` 后复用的生命周期隔离（用例内快照、串行或升级 Bun ≥1.2.10）；②`selfScheduling` 固定日期/医生号源夹具跨轮次残留，需种子唯一化或用前清理；③默认 demo 模式写 uuid 外键报错的 env 模式矛盾根治。
- **代码质量待办**：38 处 `any` 收窄；生产裸 `console.log` 迁移结构化日志（保留 error/warn 告警）；未使用导出/死代码跨文件扫描（配合 noUnusedLocals 与引用图）；server.ts 剩余 9 处不可考注释乱码。
- **文档待裁决**：出参嵌套子字段披露粒度、06/24/29 职责漂移、30 动态只读、角色列契约、空权限语义、预留错误码；入参对象数组元素逐字段表未拆。
- 本轮临时探针/备份/取证日志不入库；docs CRLF→LF 历史漂移不纳入提交。

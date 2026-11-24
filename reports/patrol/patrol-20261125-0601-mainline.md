# 巡检简报 2026-11-25 06:01 轮（定时唤醒 · 自排班夹具残留治理 · 配送外键竞态复核加固 · 隔离钩子复查 · 静态增量甄别）

## 概要
本轮在起点基线 `b63af2a1`（三远端 `consult-agent-m86` 逐字一致、ahead/behind 0/0）上，推进不依赖架构拍板的测试隔离与剩余小债：①selfScheduling 内存号源跨轮次残留治理，补 DEMO 守卫 `_reset` 演示/测试钩子，用例前后清空内存台账；②internetDelivery 后台 finalize 23503 外键竞态复核，定位为前序 humanTask 悬挂实例的后台异步兑现窗口，在 humanTask `afterAll` 经既有取消路径先收口悬挂实例，不改生产事务语义；③复查改写 DEMO_MODE / 限流桶 / 内存聚合器状态的测试钩子，快照恢复与 afterAll 清理齐备，未发现新漏还原；④静态治理仅甄别本轮增量，未引入新 `any`/`console`/未使用导出，存量静态债列入待办，不批量重构。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端 TS 仓库根 `typescript 6.0.2`；前端 `web/` 独立 `typescript 5.6.3`（~5.6.3）。
- 后端 tsc：仓库根 `node_modules\.bin\tsc.cmd --noEmit`；前端 tsc：`web\node_modules\.bin\tsc.cmd --noEmit`；前端 vitest 传完整文件路径。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移记账 **350**；`iam.roles` **11**；`agent.workflow_instances` 残留 **0**。
- 起点基线 HEAD：`b63af2a1d60c5bee99b114899582ff78c580fcb2`（origin / gitcode / mirror 的 `refs/heads/consult-agent-m86` 逐字一致、0/0；远端 `HEAD` 符号指向 `master`，与本轮推送分支无关）。
- 8080 demo 实例：本轮为加载新 `_reset` 路由重启，新 PID **47896**（`bun run src/bff/server.ts`，DEMO_MODE=1），`/health` **200**。

## 本轮改动（3 个源码/测试文件，+37 / -1）
| 文件 | 改动 | 性质 |
|---|---|---|
| `src/bff/routes/selfScheduling.ts` | 新增 `POST /api/v1/self-scheduling/slots/_reset`（`auth:true`，`DEMO_MODE!=='1'` 抛 403），调用既有聚合器 `__resetStore()` 清空内存号源/预约台账并复位序号；头注释补 `_reset` 行 | 演示/测试钩子，对称既有 `_seed` DEMO 守卫；不改容量/过滤/事务语义/上线契约 |
| `tests/integration/selfScheduling-e2e.test.ts` | `beforeAll` 健康检查后先 `_reset`；`afterAll` 再次 `_reset` 清场；import 补 `afterAll` | 夹具隔离，消除长驻进程跨轮次号源累积 |
| `tests/integration/humanTask.test.ts` | `afterAll` 在 `removeBuilderAgent` 前，先按 `agentId` 列出实例，将 `running/pending/waiting_human` 悬挂实例经既有 `cancelAgentRun` 终态落库；import 补 `listAgentRuns` | 测试隔离收口，走既有生产取消路径，不改生产事务语义 |

## 专项① selfScheduling 夹具号源残留治理
- 根因：`selfSchedulingAggregator` 为 BFF 进程内存态单例（模块级 `slots` Map / `bookings` / `seq`）；e2e 真 HTTP 打长驻 8080，与测试进程不共享模块副本。种子用固定日期 `2099-11-10`、固定 `doctorId=D1`、固定 timeSlot，`_seed` 追加不清理；跨轮次累积后 `listSlots?date=2099-11-10` 期望 2 实得 8、CT 首约期望 200 实得 409。
- 治理：聚合器既有导出 `__resetStore()`（单测已用）；本轮在路由层对称 `_seed` 惯例补 DEMO 守卫 `_reset` 端点暴露给演示进程，测试 `beforeAll/afterAll` 各调一次。生产 `DEMO_MODE=0` 下 403 不暴露；未触碰生产容量、过滤与事务逻辑。
- 取证：
  - 进程内单测 `tests/unit/selfScheduling.test.ts`：**14 pass / 0 fail**，退出码 **0**。
  - 真实模式 e2e `tests/integration/selfScheduling-e2e.test.ts`：连续两轮各 **10 pass / 0 fail**，退出码 **0**；第二轮从 `afterAll` 清场后的干净状态起，无残留累积。

## 专项② internetDelivery 23503 外键竞态复核
- 现象（历史全量日志）：`[agent-runtime] background finalize failed`，`workflow_node_records` 插入违例 `workflow_node_records_instance_id_fkey`（23503），`instance_id` 不在 `agent.workflow_instances`；用例本体 **13 条全 pass**，竞态为后台异步 stderr 噪声。
- 复核结论：
  - 单跑 `internetDelivery.test.ts`：**13 pass / 0 fail**，退出码 **0**，未复现 23503。
  - 单跑 `humanTask.test.ts`：**13 pass / 0 fail**，退出码 **0**，未复现 23503。
  - 噪声归属：`humanTask` 用例「越权：药师处理 → 403」发起的 waiting_human 实例无人处理、未轮询终态，后台 `scheduleBackgroundFinalize` 句柄悬挂；全量同进程串行时，该后台句柄在后续文件 / 退出窗口才兑现，而对应实例已被清理，`persistRunOutcome` 首句插节点记录撞外键。`agentRuntimeRepo` 无删除 instances 路径，FK 为 `ON DELETE CASCADE`；该竞态为测试生命周期特有，生产流程实例不会被并发删除。
- 加固（夹具层，不改生产事务语义）：`humanTask.afterAll` 先按 `agentId` 列出实例，悬挂态逐个 `cancelAgentRun`（既有生产取消路径，内部 `await handle.result` 等终态落库），再 `removeBuilderAgent`。
- 合并串行取证：`humanTask` + `internetDelivery` + `selfScheduling-e2e` 三文件同进程：**36 pass / 0 fail / 89 expect**，退出码 **0**；本轮 internetDelivery 段**未再出现** 23503 / `background finalize failed`。
- 隔离边界：残余风险为其他长驻演示内存聚合器的跨轮残留，列入待办；未改后台 finalize 事务顺序、未改外键约束。

## 专项③ 测试隔离钩子复查（DEMO_MODE / 限流桶 / 内存聚合器）
- **DEMO_MODE 快照恢复**：
  - `support/mockScope.ts`：`useMockData()` 进入前置 `previous`，`afterAll` 还原（未设置则 `delete`）；医疗工具单测、场景流程、性能基线经此隔离。
  - `prodDemoFailClosed.test.ts` / `globalRateLimit.test.ts` / `medmusePersist.test.ts` / `sessionRuntime.test.ts` / `consultAgentRepo.test.ts` / `wormKeyProvider.test.ts` / `wormKeysRoutes.test.ts`：均以 `beforeEach`/顶层保存 `savedDemoMode`，`afterEach`/`afterAll` 还原（未设置则 `delete`），并配合 `_resetEnvCache`。
  - `demoModeGuard.test.ts`：顶层置 `DEMO_MODE=1`，`afterAll` `delete DEMO_MODE` + `_resetEnvCache`。观察项：该文件顶层 `delete process.env.DATABASE_URL` 未在 afterAll 还原；DB 连接池模块级缓存且 unit 与 integration 分进程批次，历史基线未受影响，列入待办，本轮不改动 env 快照逻辑。
- **限流桶**：`rateLimit.ts` 导出 `__resetRateLimitBuckets()`，`user-sessions` / `mfa-login` 在 `beforeEach` 调用；`loginLockoutAggregator` 内存桶在 `globalRateLimit` / `loginLockout` 单测 `beforeEach __resetStore()`。
- **内存聚合器**：进程内单测普遍 `beforeEach __resetStore`；打长驻 8080 的 e2e 中，`engagement-e2e` 等按 `Date.now()` 盐值唯一 patientId 做患者维度隔离，断言按 PID 过滤、不做全局计数，内存残留不命中新断言；selfScheduling 全局计数残留本轮已修。
- 结论：未发现新的漏还原钩子；现有快照恢复与 afterAll 清理齐备。

## 专项④ 静态治理（本轮增量甄别，不批量重构）
- 本轮源码增量（3 文件）复核：未引入新的 `any`、裸 `console.log` 或未使用导出；类型由后端 tsc 退出码 0 保证。
- 存量口径维持上轮结论：`src` `any` 命中 **38**；裸 `console.log` 文本命中 **43**（多数为 JSDoc 注释示例、代码质量台账文案，真实运行时调用集中在服务启动 / 迁移进度 / HTTP 访问日志 / 审计回填等有意可观测输出，删除有损可观测性）。
- 动态注册 / 反射 / 工具注册表 / repo 索引路径的导出，纯 grep 引用计数易误删公共 API，本轮未批量删除；`any` 收窄、console 结构化改造、未使用导出跨文件扫描列入待办。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 | 退出码 |
|---|---|---:|
| 后端 `tsc --noEmit`（仓库根，TS 6.0.2） | 零类型错误 | **0** |
| 前端 `web/ tsc --noEmit`（TS 5.6.3） | 配置错配阻断：`tsconfig.json(17,27) TS5103 Invalid value for '--ignoreDeprecations'`（根 tsconfig `ignoreDeprecations:"6.0"`，web 5.6.3 仅接受 `"5.0"`） | **2** |
| 进程内单测 `selfScheduling.test.ts` | 14 pass / 0 fail | **0** |
| 集成合并串行（humanTask + internetDelivery + selfScheduling-e2e） | 36 pass / 0 fail / 89 expect | **0** |

> 前端 tsc 退出 2 为既有工具链版本错配：HEAD 基线根 `tsconfig.json` 第 17 行即 `ignoreDeprecations:"6.0"`，本轮未改前端代码、未改任何 tsconfig；`web/package.json` 锁定 `typescript ~5.6.3`。该错误在类型检查前即被配置校验阻断，非本轮引入的代码类型缺陷。前端本轮零改动，类型回归风险为零；错配解除（对齐根 TS 版本或下调该选项）列入待办，不本轮擅改工具链配置。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **medical-qc 后端详情视图组装**：响应体扩字段、详情数据权限口径、latestRule 快照来源、issue 字段规范化四项待裁决后落地；本轮未扩接口形状。
- **role_permissions 全量镜像待拍板**：补 36 缺字典码、清 DB 冗余旧码、定运行时事实来源三条件未具备；未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。HTTP 429 实测受迁移链阻断，门控以现有单测为准，未伪造触顶结果。
- **测试隔离待办**：①postgres 连接池在同进程多文件 / 并发下被 `ending` 后复用的生命周期隔离（用例内快照、串行或升级 Bun ≥1.2.10）；②其余长驻演示内存聚合器的跨轮残留排查；③`demoModeGuard.test.ts` 顶层删除 `DATABASE_URL` 的 afterAll 还原；④默认 demo 模式写 uuid 外键报错的 env 模式矛盾根治。
- **工具链待办**：web 独立 TypeScript 5.6.3 与根 tsconfig `ignoreDeprecations:"6.0"` 错配（TS5103），需统一 TS 版本或下调选项后恢复前端类型门禁有效结论。
- **代码质量待办**：38 处 `any` 收窄；生产裸 `console.log` 迁移结构化日志（保留 error/warn 告警）；未使用导出/死代码跨文件扫描（配合 noUnusedLocals 与引用图）；server.ts 剩余 9 处不可考注释乱码。
- **文档待裁决**：出参嵌套子字段披露粒度、06/24/29 职责漂移、30 动态只读、角色列契约、空权限语义、预留错误码；入参对象数组元素逐字段表未拆。
- 本轮临时探针/备份/取证日志（`_rep6_*.txt`、`_probe*.sql/.ts`、`schema-backup-*.sql` 等）不入库；docs CRLF→LF 历史漂移不纳入提交。

# 巡检简报 2026-11-25 07:12 轮（定时唤醒 · 前端类型门禁入口修通 · demoModeGuard env 还原钩子 · 长驻内存聚合器只读排查归类 · 静态增量甄别）

## 概要
本轮在起点基线 `ef8ba9ca`（三远端 `consult-agent-m86` 逐字一致、ahead/behind 0/0）上，推进不依赖架构拍板的工具链、测试隔离与内存残留排查：①定位并修通 web 前端类型门禁错配——根因是跨目录裸跑 web 独立 TS 5.6.3 误读根 tsconfig（`ignoreDeprecations:"6.0"`），在根 package.json 补显式 `typecheck:web` 入口，不动 TS 版本、不放松类型检查，前后端 tsc 均取到真实退出码 0；②`demoModeGuard.test.ts` 顶层删除 `DATABASE_URL` 补 afterAll 快照还原，消除跨用例/跨文件 env 污染；③对 1986 个 BFF 聚合器做只读静态排查归类，识别缺清空钩子的可变写台账候选（A 档 11 个），当前均为进程内单测覆盖、无长驻 e2e 命中，列入后续分批补 reset 待办，本轮不批量重构；④静态治理仅甄别本轮增量，未引入新 `any`/`console`/未使用导出。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端 TS 仓库根 `typescript 6.0.2`；前端 `web/` 独立 `typescript 5.6.3`（~5.6.3）。
- 后端 tsc：仓库根 `node_modules\.bin\tsc.cmd --noEmit`；前端门禁：根脚本 `bun run --cwd web typecheck`（= web 目录 `tsc --noEmit`，读 `web/tsconfig.json`）；前端 vitest 传完整文件路径。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移记账 **350**；`iam.roles` **11**；`agent.workflow_instances` 残留 **0**。
- 起点基线 HEAD：`ef8ba9ca79b8a9243f36a5cf2b4a2413a7ebbfa3`（origin / gitcode / mirror 的 `refs/heads/consult-agent-m86` 逐字一致、0/0；远端 `HEAD` 符号指向 `master`，与本轮推送分支无关）。
- 8080 demo 实例：`/health` **200**，PID **47896**（DEMO_MODE=1，本轮未重启）。

## 本轮改动（2 个文件，+约 12 行）
| 文件 | 改动 | 性质 |
|---|---|---|
| `package.json` | scripts 新增 `"typecheck:web": "bun run --cwd web typecheck"`；既有根 `typecheck`（后端 TS 6.0.2）不变 | 门禁入口显式隔离：根侧一键切到 web 目录跑其本地 5.6.3 与 `web/tsconfig.json`，避免跨目录裸跑误读根配置；不改类型严格度、不改任何 tsconfig |
| `tests/unit/bff/demoModeGuard.test.ts` | 顶层在 `delete DATABASE_URL` 前快照 `__originalDatabaseUrl`；`afterAll` 还原：原存在则恢复原值，原本未设则保持 `delete`，随后 `_resetEnvCache()` | 测试隔离钩子，消除 env 跨用例/跨文件污染；不放松 DEMO 守卫策略 |

## 专项① web 前端类型门禁错配修通
- **根因实测**：根 TS 6.0.2 + 根 `tsconfig.json`（`ignoreDeprecations:"6.0"`）；web TS 5.6.3 + `web/tsconfig.json`（独立、无 `extends`、无 `ignoreDeprecations`）。
  - 复现：仓库根目录用 web 5.6.3 二进制裸跑 `tsc --noEmit`（未带 `-p`），tsc 按 cwd 读到根 `tsconfig.json`，5.6.3 不接受 `ignoreDeprecations:"6.0"` → `tsconfig.json(17,27) TS5103`，退出码 **2**。
  - 对照：web 目录下 `tsc --noEmit`（或根目录 `tsc -p web/tsconfig.json`）→ 退出码 **0**，web 配置本身零类型错误。即错配是**调用入口跨目录误读父配置**，并非 web 代码存在类型缺陷。
- **方案比选与取舍**：
  - 方案 A（落地，入口隔离）：根 package.json 补 `typecheck:web`，显式 `bun run --cwd web typecheck`，固化正确 cwd 与本地 5.6.3 二进制；不动版本、不放松 `strict`/`noUnusedLocals` 等任何检查项。
  - 方案 B（列待决策，不硬升）：将 web 独立 TS 对齐到 6.0.2。牵涉 antd 5.22 / React 19 / vitest 2.1.8 / `@types/*` 对 TS 6 的类型兼容回归，影响面需专项评估，本轮不升级。
  - 方案 C（不可行）：下调根 `ignoreDeprecations` 会让根 6.0.2 反向报错，不可取。
- **取证（真实退出码）**：
  - 后端根 tsc（TS 6.0.2）：退出码 **0**，零错误。
  - 前端 `bun run typecheck:web`（TS 5.6.3）：退出码 **0**，零错误。

## 专项② demoModeGuard env 还原钩子
- 问题：`demoModeGuard.test.ts` 顶层 `delete process.env.DATABASE_URL`，原 `afterAll` 仅 `delete DEMO_MODE` + `_resetEnvCache`，未还原 `DATABASE_URL`；env 模块有 `_cached` 快照，`_resetEnvCache()` 置空后下次重读 `process.env`，故需在还原 env 后再清缓存。
- 加固：删除前快照原值；`afterAll` 按"原值 undefined → delete，否则恢复"还原，再 `_resetEnvCache()`。
- **取证**：`tests/unit/bff/demoModeGuard.test.ts` 单测 **9 pass / 0 fail / 45 expect**，退出码 **0**。
- **其余 env 删除点复查归类**（本轮逐一核对快照/还原钩子）：
  - 已闭环（有快照 + `beforeEach/afterEach/afterAll` 还原）：`support/mockScope.ts`、`prodDemoFailClosed`、`globalRateLimit`、`medmusePersist`、`sessionRuntime`、`consultAgentRepo`、`wormKeyProvider`、`wormKeysRoutes`、`wormArchive`、`keyOpsStore`、`auditEventStore`、`backfillTruncation`、`DeepSeekProvider`、`loginLockout` 等。
  - 低风险待办（分进程批次或变量本地本就未配）：`ai-interpretation.test.ts:74` 顶层删 `LLM_API_KEY` 未快照还原（integration 批次）；`worm-s3-fallback.test.ts:196` 用例内删 `S3_ENDPOINT` 未还原（integration 批次）；`wormKeyProvider.test.ts` 快照表未含 `WORM_SM2_PRIVATE_KEY`/`WORM_SM2_PUBLIC_KEY`，afterAll 未还原这两键；`backfillTruncation.test.ts:35` afterEach 删 `AUDIT_BACKFILL_LIMIT` 未快照原值（该变量通常未设）。列入后续隔离加固，本轮不扩改。

## 专项③ 长驻内存聚合器残留只读排查归类
- 范围：`src/bff/aggregators/*.ts`（排除 node_modules/pgsql/web），并复核 `middleware`/`routes`/`agents`/`events` 已知内存类。启发式静态扫描 + 人工复核，未运行时内省，未改任何生产/测试源码。
- 总览：命中顶层候选声明 **270** 处——可变写 **205** 处（83 文件）、静态只读 **65** 处。
  - **A 档 · 缺清空钩子的可变写台账（11 文件，候选后续补 reset）**：`aiQualityAggregator`、`dataMartAggregator`、`eSignatureAggregator`、`healthCheckupAggregator`（双 Map + seq）、`i18nAggregator`、`i18nDeepAggregator`、`oaApprovalAggregator`、`partyCultureAggregator`（四台账）、`partyUnionAggregator`、`satisfactionAggregator`、`smartFollowupAggregator`。共性：模块级 Map 写状态、路由可写、未导出任何清空函数；**当前仅有进程内单测**（satisfaction 另有进程内集成 + PG afterAll 清库，内存镜像不等同清空），未发现直连 8080 的真 HTTP e2e 断言其全量列表/计数。
  - **B 档 · 有界/生命周期/计数器/静态种子（8 文件，低-中，暂不强制）**：`agentRuntimeAggregator` 句柄注册表（取消/完成时 delete 回收）、`healthReportAggregator` 单调仪表计数、`intelligenceScore`/`systemIntelligence` 有界历史缓冲（CAP shift）、`performanceMonitor`（5000 splice）/`systemMetrics`（10000 splice）环形缓冲、`uiConsistency` 序号每次调用归零、`patient360` 静态种子表。
  - **B+ 档 · 已有 clear 类导出（4 文件，聚合器层闭环，无 HTTP 端点）**：`clinicalPathwayAggregator.clearPathwayDeviations`、`migrationStatusAggregator.clearMigrationFailures`、`performanceOptimizationAggregator.clearPerformanceCache`、`queryOptimizationAggregator.clearQueryOptimizationCache`。
  - **C 档 · 已闭环（60 文件）**：导出 `__resetStore`/`resetXxx`，进程内单测 `beforeEach/afterEach` 调用；长驻 e2e 跨进程不可达内存 reset，靠盐值唯一标识 + 基线增量断言隔离。
  - **D 档 · 纯派生/静态常量（65 处声明）**：阈值、允许态 Set、种子查表 Map、静态词库，只读派生，无需处理。
- **已知内存类复核**：限流桶 `rateLimit.ts`（`__resetRateLimitBuckets`，`mfa-login`/`user-sessions` beforeEach 调用）；登录锁 `loginLockoutAggregator`（`__resetStore` 清四桶，单测 beforeEach 调用）。两者 e2e 均无 HTTP 全局 reset，靠盐值/增量隔离；`globalRateLimit-e2e` 在 DEMO_MODE 跳过 429 断言。
- **路由层 HTTP 清场端点全集**：仅 `self-scheduling/slots/_reset`（DEMO 守卫）、`worm/_probes/reset`、`worm/keys/purge` 三个；其余 `_seed` 端点为播种非清场。
- **范围外观察（另开专项）**：`src/bff/routes` 下约 **103 个路由文件**在文件内自挂模块级 Map/数组演示台账（m528–m610、V5/V14/V6/V7、muse/ops 等），无 reset 导出、无 HTTP 清场端点，未逐一定级。
- **本轮定级与取舍**：A 档 11 个当前进程内单测以唯一 recordId/单据键 + 基线增量断言隔离，抽跑 `aiQuality` **17 pass**、`dataMart` **10 pass**、`eSignature` **8 pass**，退出码 **0**，未见现存跨用例污染 fail。按谨慎原则，本轮不批量给 11 个聚合器加导出；后续轮按 `selfSchedulingAggregator:152` 样板分批补 `__resetStore`（含多台账/seq 一并清）+ 单测 `beforeEach` 接入，新增真 HTTP e2e 前再按惯例补路由 DEMO 守卫 `_reset`。
- 明细证据行号见临时扫描件 `reports/patrol/_scan_mem_20261125-0747.md`（前缀 `_scan_mem_`，不入库）。

## 专项④ 静态治理（本轮增量甄别，不批量重构）
- 本轮增量（package.json 脚本、demoModeGuard 测试钩子）复核：未引入新的 `any`、裸 `console.log` 或未使用导出；后端 tsc 退出码 0 保证类型。
- 存量口径维持前轮：`src` `any`、生产裸 `console.log`、未使用导出仍列入待办；动态注册/反射/工具注册表路径不批量删。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 | 退出码 |
|---|---|---:|
| 后端 `tsc --noEmit`（仓库根，TS 6.0.2） | 零类型错误 | **0** |
| 前端 `bun run typecheck:web`（web TS 5.6.3，显式 `-p web/tsconfig.json` 等价 cwd 隔离） | 零类型错误 | **0** |
| 进程内单测 `demoModeGuard.test.ts` | 9 pass / 0 fail / 45 expect | **0** |
| A 档抽跑 `aiQuality` / `dataMart` / `eSignature` | 17 / 10 / 8 pass，0 fail | **0** |

> 上轮记录的前端 tsc 退出 2（TS5103）本轮已通过显式门禁入口消除：正确 cwd / 显式 `-p` 下 web 5.6.3 读独立 `web/tsconfig.json` 类型检查通过。根配置 `ignoreDeprecations:"6.0"` 仅服务根 TS 6.0.2 后端编译，未改动。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **medical-qc 后端详情视图组装**：响应体扩字段、详情数据权限口径、latestRule 快照来源、issue 字段规范化四项待裁决后落地；本轮未扩接口形状。
- **role_permissions 全量镜像待拍板**：补 36 缺字典码、清 DB 冗余旧码、定运行时事实来源三条件未具备；未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。HTTP 429 实测受迁移链阻断，门控以现有单测为准，未伪造触顶结果。
- **测试隔离待办**：①A 档 11 个聚合器分批补 `__resetStore` + 单测 `beforeEach` 接入（含 healthCheckup 双 Map+seq、partyCulture 四台账一并清）；②路由层约 103 个本地内存台账另开专项扫描与治理；③env 残留小项（见专项②低风险清单）；④postgres 连接池同进程生命周期隔离；⑤其余长驻演示内存聚合器跨轮残留持续观察。
- **工具链待办**：web 独立 TS 5.6.3 与根 TS 6.0.2 版本对齐（方案 B）需专项评估 antd5/React19/vitest2.1.8/`@types` 兼容回归后再决策；本轮以入口隔离跑通门禁，未升级版本。
- **代码质量待办**：存量 `any` 收窄；生产裸 `console.log` 迁移结构化日志（保留 error/warn 告警）；未使用导出/死代码跨文件扫描；server.ts 剩余不可考注释乱码；其余长驻内存聚合器排查。
- **文档待裁决**：出参嵌套子字段披露粒度、06/24/29 职责漂移、30 动态只读、角色列契约、空权限语义、预留错误码；入参对象数组元素逐字段表未拆。
- 本轮临时探针/备份/取证日志（`_rep7_*.txt`、`_scan_mem_*.md`、`_probe*.sql/.ts`、`schema-backup-*.sql` 等）不入库；docs CRLF→LF 历史漂移不纳入提交。

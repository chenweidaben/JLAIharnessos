# 巡检简报 2026-11-25 13:01 轮（定时唤醒 · 连接池测试层隔离对齐 14 件 · 限流桶跨进程挂载点甄别 · 审计链残留处置方案落档 · 串行回归取证）

## 概要
本轮在起点基线 `d6facf8d`（三远端 `consult-agent-m86` 逐字一致、ahead/behind 0/0）上，推进不依赖架构拍板的测试基础设施隔离治理，生产行为不变、不触碰待拍板表结构与上线契约：①只读评估 postgres.js 连接池在测试进程内的生命周期与登录限流内存桶隔离现状；②对 14 个真打主池、afterAll 漏关池的 integration 测试，按既有 `closeDbForTest` 样板补测试层关池钩子；③审计链残留仅在本地测试库范围评估清链/重算/根因修复方案并落档，未执行任何持久化清理；④受影响批次独立进程与同进程串行复跑取证，前后端 tsc 取真实退出码，增量静态甄别。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端 TS 仓库根 `typescript 6.0.2`；前端 `web/` 独立 `typescript 5.6.3`。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移记账 **350**；`iam.roles` **11**；`agent.workflow_instances` 残留 **0**。
- 起点基线 HEAD：`d6facf8d0b5355d3128db1bbc180af7f81fa263f`（origin / gitcode / mirror 的 `refs/heads/consult-agent-m86` 逐字一致、0/0）。
- 8080 demo 实例：`/health` **200**（DEMO_MODE=1，本轮未重启）。
- 本轮生产 `src/` 零改动；改动仅落在 `tests/integration` 14 个文件的 afterAll 测试钩子。

## 专项① 连接池测试层隔离现状评估与 14 件关池钩子对齐
### 现状评估（只读）
- 连接池模块 `src/db/pool.ts`：模块级单例 `_sql`，`getDb()` 懒建；既有测试钩子 `closeDbForTest()`（关物理池并重置关闭标志，使后续测试可重建）、`_resetDbForTest()`（仅置 null）、`execTestCleanup`/`releaseTestVisit`（独立短连接清理，绕开主池 afterEach pump 缺陷）。
- 170 个 integration 文件分类：
  - **35** 个 `fetch` 长驻 8080 BFF（独立进程，不占测试进程主池）；
  - **113** 个进程内文件 afterAll 已调 `closeDbForTest()` 关池；
  - **22** 个进程内文件未关池；甄别后 **8** 个纯内存/不打主池（scenario1–5、consultFlow、consultRouteErrors、worm-s3-fallback，无需关池），**14** 个真打主池、afterAll 漏关池。

### 落地清单（14 件，afterAll 末尾补 `await closeDbForTest()`，import 补 `closeDbForTest`）
- 改动性质：纯测试层关池钩子；不改动清理 SQL、不动生产池上限/策略、不向生产暴露清场端点。
- 独立进程真实模式（`TEST_REAL=1` + `DEMO_MODE=0`）复跑取证：

| 测试文件 | 独立进程结果 | 退出码 |
|---|---|---:|
| consultation.test.ts | 14 pass / 0 fail | 0 |
| empi.test.ts | 15 pass / 0 fail | 0 |
| smartTriage.test.ts | 17 pass / 0 fail | 0 |
| multiTenant.test.ts | 12 pass / 0 fail | 0 |
| data-governance.test.ts | 17 pass / 0 fail | 0 |
| internetDelivery.test.ts | 13 pass / 0 fail | 0 |
| internetPayment.test.ts | 11 pass / 0 fail | 0 |
| knowledgeBase.test.ts | 13 pass / 0 fail | 0 |
| lakehouse.test.ts | 17 pass / 0 fail | 0 |
| research-cohort.test.ts | 19 pass / 0 fail | 0 |
| satisfaction.test.ts | 12 pass / 0 fail | 0 |
| agentBuilder.test.ts | 18 pass / 0 fail | 0 |
| agentRuntime.test.ts | 12 pass / 0 fail | 0 |
| humanTask.test.ts | 13 pass / 0 fail | 0 |

- **同进程串行批次**：14 文件同 bun 进程串行执行，**203 pass / 0 fail / 570 expect**，退出码 **0**，多文件串联无 hang、无堆崩溃。

## 专项② 登录限流内存桶隔离甄别（本轮不补测试层钩子）
- 限流桶位于 `loginLockoutAggregator.ts`：模块级 4 个 Map（`accounts` / `ipLogin` / `readBuckets` / `writeBuckets`），已有既有 `__resetStore()` 清空惯例。
- 甄别结论：
  - 进程内 dispatch 的 integration 不经 `globalRateLimit` 中间件（该中间件仅在 `server.ts` HTTP 链路调用），桶不在测试进程累积；全仓 0 个测试直接 import 该聚合器。
  - 35 个打长驻 8080 BFF 的 e2e，桶在 BFF 进程内存，测试进程内 `__resetStore()` 跨进程够不到；全量并发多文件打 8080 触发的 429 来自 BFF 进程写/登录桶。
- 处置：测试层在当前装配下**无有效挂载点**，本轮不补限流 reset（与档 A 内存台账同构结论）。跨进程桶隔离只能依赖 BFF 侧重启/清桶（红线：不向生产暴露清场端点）或测试调度串行/降并发，列入待办。

## 专项③ 测试库审计链残留处置方案（落档评估，未执行清理）
- 断点取证：`audit.events` 2057 条、seq 1..2057 连续；断点 **seq 1647** `prev_hash` 脱节指向 seq 1000 陈旧基准（06:09 历史轮次 self-scheduling 种子/回填写入）；影响 forensic-e2e 4 条 + auditEvents-e2e 1 条。
- 根因研判：`recordEvent` 的 prevHash/seq 基准取自内存 pending 池尾而非 DB 链头；跨进程反复启动、backfill fromSeq 偏差或内存池未完整对齐时可能基于陈旧链尾分叉。
- 方案三选一（均需显式授权前提，本轮未执行）：
  1. **本地测试库清表重建**（推荐测试环境）：重置窗口清空 `audit.events` 后由测试重新累积自洽链；前提仅本地测试库、确认无留存取证数据、执行前备份、经授权。
  2. **按 seq 整条重算链**：复用应用层 `canonical`/`computeHash` 从 seq=1 重算回写；前提本地库、先备份、先抽样比对 1..1646 现存 hash 一致。
  3. **生产根因修复**（专项评审）：prevHash/seq 基准改读 DB 链头或 append 前校验内存池尾与 DB maxSeq 一致；属生产写入路径改动，不在本轮低风险范围。
- 完整方案、影响面与红线见临时件 `reports/patrol/_scan_audit_chain_resolution_20261125-1301.md`（前缀 `_scan_`，不入库）。本轮未清表、未重算、未改表结构、未改链算法、未回填任何库。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 | 退出码 |
|---|---|---:|
| 后端 `tsc --noEmit`（仓库根，TS 6.0.2） | 零类型错误 | **0** |
| 前端 `bun run --cwd web typecheck`（web TS 5.6.3） | 零类型错误 | **0** |
| 14 件独立进程真实模式复跑 | 全部 0 fail | **0** |
| 14 件同进程串行批次 | 203 pass / 0 fail / 570 expect | **0** |

## 增量静态甄别
- 本轮 14 文件增量 **28** 行（14 处 import 补 `closeDbForTest` + 14 处 afterAll `await closeDbForTest()`）：代码侧 `any`=**0**、裸 `console`=**0**；未新增导出（`closeDbForTest` 为 `pool.ts` 既有测试专用导出）。
- 存量维持列待办、不批量重构：`any` **38** 处、裸 `console.log` **43** 处、约 **1.86 万** 导出符号。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **审计链残留**：待方案 1/2 获授权在本地测试库执行后复测 5 条转绿；根因修复（方案 3）留生产专项评审。
- **连接池/限流待办**：①postgres 连接池同进程生命周期隔离与 afterEach pump 缺陷（M48-A）根因根治；②打长驻 BFF 的 e2e 限流桶跨进程隔离/测试调度串行降噪；③其余长驻演示内存聚合器跨轮残留持续观察。
- **medical-qc 后端详情视图组装**：四项待裁决后落地；本轮未扩接口形状。
- **role_permissions 全量镜像待拍板**：三前置条件未具备；未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。HTTP 429 生产触顶实测受迁移链阻断，门控以现有单测为准，未伪造触顶结果。
- **工具链待办**：web 独立 TS 5.6.3 与根 TS 6.0.2 版本对齐需专项评估 antd5/React19/vitest2.1.8/`@types` 兼容回归后再决策；本轮以入口隔离跑通门禁，未升级版本。
- **代码质量待办**：存量 `any` 收窄；生产裸 `console.log` 迁结构化日志；未使用导出/死代码跨文件扫描；server.ts 剩余不可考注释乱码。
- **文档待裁决**：出参嵌套子字段披露粒度、06/24/29 职责漂移、30 动态只读、角色列契约、空权限语义、预留错误码。
- 本轮临时探针/扫描件/备份/历史 patrol 切片（`_rep9_*`、`_rep8_*`、`_probe*.sql/.ts`、`_seed_*.sql`、`_sweep*.ps1`、`schema-backup-*.sql`、`_scan_*.md`、20261103–20261117 切片与 round1-3）不入库；docs CRLF→LF 历史漂移不纳入提交。

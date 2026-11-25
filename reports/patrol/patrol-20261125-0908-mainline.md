# 巡检简报 2026-11-25 09:08 轮（定时唤醒 · A 档 11 台账测试隔离落地 · env 残留 4 处还原收口 · 路由层本地台账只读归类 · 双门禁与受影响回归取证）

## 概要
本轮在起点基线 `18fc841c`（三远端 `consult-agent-m86` 逐字一致、ahead/behind 0/0）上，推进不依赖架构拍板的测试隔离与工程债分批治理，生产行为不变、不触碰待拍板表结构与上线契约：①A 档 11 个缺清空钩子的可变写台账聚合器，按 `selfScheduling`/既有 `__resetStore` 样板补测试专用 reset 导出，对应 unit 单测接入 `beforeEach` 隔离；②上轮复核出的 4 处无快照/无 afterEach 还原的 env 删除点补还原钩子，不放松生产守卫策略；③`src/bff/routes` 下 2474 个路由文件本地内存台账做只读三档归类，清单落临时扫描件备查，未批量改生产代码；④受影响测试串行复跑、前后端 tsc 取真实退出码，双门禁与受影响批次均绿。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端 TS 仓库根 `typescript 6.0.2`；前端 `web/` 独立 `typescript 5.6.3`。
- 后端 tsc：仓库根 `node_modules\.bin\tsc.cmd --noEmit`；前端门禁：`bun run --cwd web typecheck`（= web 目录 `tsc --noEmit`，读 `web/tsconfig.json`）；bun test 传完整文件路径，避免 Bun 1.2.0 位置参数子串误纳 web 目录。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移记账 **350**；`iam.roles` **11**；`agent.workflow_instances` 残留 **0**。
- 起点基线 HEAD：`18fc841c066e7c9142d37b894a311c079868565c`（origin / gitcode / mirror 的 `refs/heads/consult-agent-m86` 逐字一致、0/0；远端 `HEAD` 符号指向 `master`，与本轮推送分支无关）。
- 8080 demo 实例：`/health` **200**，PID **47896**（DEMO_MODE=1，本轮未重启）。

## 专项① A 档 11 个可变写台账补测试层 reset 隔离
- 样板定型：聚合器在读取快照导出函数后追加 `export function __resetStore(): void { <台账>.clear(); ... }`；Map 用 `.clear()`，模块级序号计数器归零；单测 bun:test import 补 `beforeEach`、聚合器 import 补 `__resetStore`，顶层加 `beforeEach(() => __resetStore());`。reset 仅测试专用，不暴露任何 HTTP 清场端点，不改生产读写逻辑/事务语义。
- 落地清单（聚合器 · 清空项 · 单测 · pass/fail/expect · 退出码）：

| # | 聚合器 · 台账 | reset 清空项 | 单测 | pass / fail / expect | 退出码 |
|--:|---|---|---|---|--:|
| 1 | aiQualityAggregator · `feedbackRegistry` | `feedbackRegistry.clear()` | aiQuality.test.ts | 17 / 0 / 43 | 0 |
| 2 | dataMartAggregator · `registry` | `registry.clear()` | dataMart.test.ts | 10 / 0 / 44 | 0 |
| 3 | eSignatureAggregator · `ledger` | `ledger.clear()` | eSignature.test.ts | 8 / 0 / 18 | 0 |
| 4 | healthCheckupAggregator · `orders`、`resultsByCheckup`、`seq` | 两 Map `.clear()` + `seq = 0` | healthCheckup.test.ts | 13 / 0 / 37 | 0 |
| 5 | i18nAggregator · `registry`、`autoRules`、`seeded` | 两 Map `.clear()` + `seeded = false` | i18n.test.ts | 13 / 0 / 21 | 0 |
| 6 | i18nDeepAggregator · `registry` | `registry.clear()` | i18nDeep.test.ts | 15 / 0 / 64 | 0 |
| 7 | oaApprovalAggregator · `ledger` | `ledger.clear()` | oaApproval.test.ts | 9 / 0 / 38 | 0 |
| 8 | partyCultureAggregator · `activityLedger`/`cultureEventLedger`/`ethicsEvidenceLedger`/`ethicsResultLedger` | 四 Map `.clear()` | partyCulture.test.ts | 14 / 0 / 44 | 0 |
| 9 | partyUnionAggregator · `ledger` | `ledger.clear()` | partyUnion.test.ts | 9 / 0 / 38 | 0 |
| 10 | satisfactionAggregator · `anonymousLedger` | `anonymousLedger.clear()` | satisfaction.test.ts（unit） | 16 / 0 / 53 | 0 |
| 11 | smartFollowupAggregator · `consentStore` | `consentStore.clear()` | smartFollowup.test.ts | 22 / 0 / 41 | 0 |

- **两处需评审知悉的处置**：
  - **i18nAggregator 额外纳入 `seeded` 标志**：该 `let seeded = false` 是种子幂等闸门（`seedI18n()` 命中标志早退）；只清字典会让复测时种子不重灌内置文案，故 reset 一并 `seeded = false`。其余 10 个聚合器顶层复查无模块级 seq/计数器。
  - **partyUnion 跨用例依赖用例**："按月分布"用例原本依赖上一用例登记的两场 2099 活动，`beforeEach` 重置后首跑 1 fail（`monthly[3]=0`）。处置为在该用例自身 setup 补入同源同参的两场活动，**断言一行未改**；复跑 9 pass / 0 fail / 退出码 0。
  - smartFollowup 已有 `beforeEach`，按规范把 `__resetStore()` 并入既有钩子（全量清空后再 revoke 已知 patientId 双保险），未重复定义；`tests/integration/satisfaction.test.ts` 未改（集成走 PG afterAll 清库）。
- 函数内局部变量（dataMart `h`、i18nDeep `catStats`、partyCulture `score`、satisfaction `dimStats/grandSum/grandCount/seen`、smartFollowup `score` 等）经甄别不纳入 reset。
- **取证**：11 个 unit 串行复跑汇总 **146 pass / 0 fail / 441 expect**，退出码 **0**。

## 专项② env 改写低风险 4 处还原收口
| 文件 | 问题 | 加固 | 取证 |
|---|---|---|---|
| `tests/integration/ai-interpretation.test.ts` | 顶层 `delete LLM_API_KEY` 未快照还原 | 删除前快照 `originalLlmApiKey`，`afterAll` 按"原值 undefined → delete，否则恢复"还原 | 真实模式 **10 pass / 0 fail / 36 expect**，退出码 **0** |
| `tests/integration/worm-s3-fallback.test.ts` | 用例内 `delete S3_ENDPOINT` 未还原 | 用例内 `try/finally` 局部还原原值 | 真实模式 **8 pass / 0 fail / 20 expect**，退出码 **0** |
| `tests/unit/wormKeyProvider.test.ts` | `ORIGINAL_ENV` 未含 `WORM_SM2_PRIVATE_KEY/PUBLIC_KEY`，afterAll 未兜底还原 | 两键补入顶层快照表，afterAll 统一还原；describe 级局部 afterAll 保留作双保险 | **29 pass / 0 fail / 63 expect**，退出码 **0** |
| `tests/unit/backfillTruncation.test.ts` | `afterEach` 删 `AUDIT_BACKFILL_LIMIT` 未快照原值 | 模块级快照 `ORIGINAL_BACKFILL_LIMIT`，afterEach 按原值还原 | **4 pass / 0 fail / 13 expect**，退出码 **0** |

- 未放松 DEMO/生产守卫策略；env 守卫逻辑、生产读写路径均未改动。

## 专项③ 路由层本地内存台账只读归类（不改生产）
- 范围：`src/bff/routes` 下全部 `.ts`（含 `admin/` 子目录，排除 `node_modules` 与测试文件 `imaging.test.ts`）；静态文本分析 + 存疑项人工抽样复核，未做运行时内存增长验证。
- 总览：扫描路由文件 **2474** 个，模块级声明 **4061** 条。

| 归类 | 条数 | 涉及文件 | 说明 |
|---|---:|---:|---|
| 档 A 可变写台账（真残留风险候选） | **142** | 138 | handler 直接写 / helper 介导写 / 引用字段变更 / 整体重赋值 / 懒加载单例变更；跨请求累积，无 reset/clear |
| 档 B 序号/统计计数器 | **67** | 65 | 单调 `+=1` 序号，无上限、请求路径不复位；残留仅限演示 ID 序号漂移 |
| 档 C-init 种子/懒初始化后只读 | 5 | — | 初始化写入一次后请求路径只读 |
| 档 C 一次性派生/只读常量（不含路由表） | 1365 | — | 词典、套餐表、静态映射、zod schema 等 |
| 路由定义表 `*Routes: RouteDef[]`（非台账，剔除） | 2482 | — | |
| 函数内局部 Map/Set/Array（不计入模块台账） | 1788 | 505 | 生命周期随请求/函数结束回收 |

- 路由目录内无任何模块级 reset/clear 导出、无 `afterEach/beforeEach` 测试钩子；仅 3 个端点名含 reset/clear，其中 2 个委托范围外的 aggregator 内存库（`selfSchedulingAggregator.js`、worm 探针库），1 个为业务改密端点，均非路由层台账清场。
- 档 A 142 条逐条文件+变量+行号+一句话风险见临时扫描件 `reports/patrol/_scan_routes_mem_20261125-0908.md`（前缀 `_scan_`，不入库）；本轮不批量改生产代码，后续持久化/隔离改造另开专项。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 | 退出码 |
|---|---|---:|
| 后端 `tsc --noEmit`（仓库根，TS 6.0.2） | 零类型错误 | **0** |
| 前端 `bun run --cwd web typecheck`（web TS 5.6.3） | 零类型错误 | **0** |
| A 档 11 个 unit 串行复跑 | 146 pass / 0 fail / 441 expect | **0** |
| env 受影响 unit：wormKeyProvider / backfillTruncation | 29 / 4 pass，0 fail | **0** |
| env 受影响 integration 真实模式：worm-s3-fallback / ai-interpretation | 8 / 10 pass，0 fail | **0** |

> 历史基线口径（存量，未在本轮全量复跑）：unit `16653 pass / 169 fail / 113 errors`（113 errors 全 Bun 1.2.0 误纳 web/tests）；integration `1429 pass / 47 skip / 46 fail`。本轮改动仅限聚合器追加测试专用 reset 导出 + 测试钩子/env 还原，生产路径不调用 reset；受影响批次已串行复跑绿，未观察到新增回归。全量 unit/真实模式 integration 留低峰批次对比基线。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **medical-qc 后端详情视图组装**：响应体扩字段、详情数据权限口径、latestRule 快照来源、issue 字段规范化四项待裁决后落地；本轮未扩接口形状。
- **role_permissions 全量镜像待拍板**：补 36 缺字典码、清 DB 冗余旧码、定运行时事实来源三条件未具备；未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。HTTP 429 实测受迁移链阻断，门控以现有单测为准，未伪造触顶结果。
- **测试隔离待办**：①路由层档 A 142 条可变写台账候选另开专项治理（当前 demo 内存态，持久化改造前不批量加端点）；②postgres 连接池同进程生命周期隔离；③其余长驻演示内存聚合器跨轮残留持续观察；④全量 unit/真实模式 integration 低峰复跑对比基线。
- **工具链待办**：web 独立 TS 5.6.3 与根 TS 6.0.2 版本对齐需专项评估 antd5/React19/vitest2.1.8/`@types` 兼容回归后再决策；本轮以入口隔离跑通门禁，未升级版本。
- **代码质量待办**：存量 `any` 收窄；生产裸 `console.log` 迁移结构化日志；未使用导出/死代码跨文件扫描；server.ts 剩余不可考注释乱码。
- **文档待裁决**：出参嵌套子字段披露粒度、06/24/29 职责漂移、30 动态只读、角色列契约、空权限语义、预留错误码。
- 本轮临时探针/备份/取证日志（`_rep8_*.txt`、`_scan_*.md`、`_probe*.sql/.ts`、`_seed_*.sql`、`_sweep*.ps1`、`schema-backup-*.sql` 等）不入库；docs CRLF→LF 历史漂移不纳入提交。

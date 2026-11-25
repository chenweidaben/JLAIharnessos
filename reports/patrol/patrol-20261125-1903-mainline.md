# 巡检简报 2026-11-25 19:03 轮（定时唤醒 · 18:14 codemod 批量改写收口 · toText 取值辅助与类型规范化分层提交 · 三镜像推送核对）

## 概要
本轮在起点基线 `2e3cf93e`（origin / gitcode / mirror 的 `consult-agent-m86` 逐字一致、ahead/behind 0/0）上，收口 18:14 一次性 codemod 与 import 修补脚本批量改写后尚未门禁/提交的工作区：①重跑前后端类型门禁取真实退出码，核验 toText codemod 与 import 归位；②全量 unit 基线对比 + 真实模式 integration 抽样回归，确认无新增回归；③按既有范式分层拆分提交，推送三远端并 `git ls-remote` 逐字核对 SHA 0/0。生产行为不变，不触碰待拍板表结构与上线契约；探针、历史切片、schema 备份、lint 扫描 JSON 与一次性 codemod 脚本不入库。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端仓库根 TypeScript `6.0.2`；前端 `web/` 独立 TypeScript `5.6.3`。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）。本轮开场实测 5433 连接被拒（postgres 进程未起，残留 stale `postmaster.pid` PID 30808 已死）；清锁后按既有口径 `-p 5433 -c listen_addresses=localhost` 启动，复核迁移记账 **350**、`iam.roles` **11**、`agent.workflow_instances` **0**，与基线一致。
- 起点基线 HEAD：`2e3cf93e9947cd5a18bb8d4df7a397acf7660bf0`；推送前 `ls-remote` 三远端该分支 SHA 逐字一致。
- 8080 demo 实例 `/health` **200**（DEMO_MODE=1，本轮未重启；新代码需重启方加载）。

## 专项① codemod 改动甄别（只读复核）
工作区 588 个 tracked modified（忽略换行漂移后实质 +2681/-2430），分两类：
1. **类型语法规范化**：`Array<T>` → `T[]`、`ReadonlyArray<T>` → `readonly T[]`；去除对象字面量上冗余的 `as` 断言（字面量类型可直接匹配返回类型）。
2. **统一 toText 取值辅助**：新增 `src/db/rowText.ts`（`toText` / `toTextOrNull` 纯函数），repo / aggregator 层 `row.x ? String(row.x) : null` 统一替换为 `row.x ? toText(row.x) : null`。

- **语义保留复核**：`toText` 对 string 原样返回；number/boolean/bigint/Date 沿用 `String()` 旧行为（不改线上输出格式）；对象/数组等脏数据回 `''`，拒绝 `'[object Object]'` 入库/出参。外层 `row.x ?` truthy 判断先挡 null/undefined/falsy，再进 `toText`，空值仍回 `null`；`toTextOrNull` 为预留成对可空 API，当前外部暂无调用。
- **静态增量甄别**：新增 `any` **0** 处（唯一定位 1 处 `any` 为既有 `Array<{...any...}>` 随语法规范化保留，未扩大）；新增裸 `console` **0**；`rowText` import 引入 114 处；多行 import 续行两处初判错位经人工 Read 顶部确认均在连续 import 区内，tsc 可解析、语法正确。
- 改动集中 `src/bff/aggregators`(221)、`src/bff/routes`(171)、`src/db/repositories`(126)、`src/bff/agents`(15)，其余零星分布 medical-tools / orchestrator / knowledge-platform / resilience / security 等；`web/` 与 `tests/` 本轮零改动。

## 专项② 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 结果 | 退出码 |
|---|---|---:|
| 后端根 `tsc --noEmit`（TS 6.0.2） | 0 条 error TS | **0** |
| 前端 `bun run --cwd web typecheck`（TS 5.6.3） | 0 条 error TS | **0** |
| unit 全量 `bun test tests/unit` | **16653 pass / 169 fail / 113 errors**（16822 tests / 2245 files） | **1** |
| integration A 批（8 文件，真实模式 `TEST_REAL=1` / `DEMO_MODE=0`） | **126 pass / 0 fail** | **0** |
| integration B 批（8 文件，真实模式） | **99 pass / 0 fail** | **0** |

- unit 计数与历史基线**逐字一致**：113 errors 全为 bun 1.2.0 子串匹配误纳 `web/tests` 的既有环境性失败（非真实缺陷）；169 fail 为历史遗留并行污染 / 既有断言，不混为本轮新缺陷。
- integration 抽样覆盖：real-persistence、consultation、appointment-followup、followupAppt、inpatient-core、medAdmin、pharmacy-dispensing、transfusion、vte、nursingIo、empi、role-administration、user-administration、mdt、internetPrescription、patientDelegation。两批合计 **225 pass / 0 fail / 16 文件**，独立 bun 进程串行、无 hang、无堆崩溃，未发现 codemod 引入的新增回归。
- 既有并行污染、web 误纳、审计链 5 条残留维持基线，本轮不剥离、不混判。

## 专项③ 分层提交（5 笔，按关注点拆分）
| # | 提交 | 范围 |
|---|---|---|
| 1 | `017d8009` refactor(db) | toText/toTextOrNull 取值辅助 `rowText.ts` + 124 个含 toText 的 repo/aggregator 文件（125 files，+1388/-1245） |
| 2 | `40a22e4d` refactor(types) | 类型语法规范化与冗余断言去除，459 个纯规范化文件（+1143/-1151） |
| 3 | `5010cb57` feat(security) | Python AI 服务生产加固：API Key 白名单生产禁 mock 回落、CORS 白名单 env 化、审计 JSONL 按日轮转、IP 桶护栏、中间件鉴权改 JSONResponse；配套 `.env.example`（4 files，+86/-34） |
| 4 | `54556b4a` docs(review) | 第二轮安全整改横向服务审核报告（Python / Java / SQL 迁移器 / 小程序 / Dockerfile），纯文档留痕（+64） |
| 5 | 本轮 mainline 简报 | 本文件 |

- 提交 3 的三个 Python 文件经 `python -m py_compile` 编译通过（exit 0）；`.env.example` 仅占位值与注释，无内嵌凭据。
- 提交前逐笔核对暂存区：无非 `src/` 探针误入、无 `_probe*`/`_rep*`/`_seed*`/`_scan*`/schema-backup/eslint JSON/TODO 台账生成物被 `git add`。

## 红线复核（拍板 / 裁决前未擅动）
- 未放松生产限流阈值与窗口策略；未新增或暴露生产可达的清场 / 全量重置端点；生产 fail-closed 口径不变。
- 未 ALTER / DROP 既有表、未回填、未改上线契约；四套漂移 DDL（256 / 349 / 350 / 369）与 339 选型、role_permissions 全量镜像三前置、medical-qc 详情组装四项、web→TS6 对齐、出参子字段粒度与预留错误码等，均维持待拍板。
- 审计链断点（seq 1647 指向 seq 1000）未清表、未重算、未改链算法。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **审计链残留**：方案 1（本地测试库清表重建）/ 方案 2（按 seq 整条重算）需确认无留存取证数据、执行前备份、显式授权后复测 5 条转绿；方案 3 生产根因修复（prevHash 改读 DB 链头）留专项评审。
- **限流桶跨进程隔离**：选项 A（测试侧 afterAll 调现有 admin `/rate-limit/unlock` 解本机 IP / 残留账号，零生产装配）可择机落地；选项 B（仅非生产注册全量桶重置端点）待生产不可达评审，本轮不落地。
- **Python / Java 服务**：Java Gateway `AuthFilter` 占位校验待排期复用 JWT 验签或网络层禁直连；12 个业务微服务 application.yml 为 H2 开发骨架，生产化切 PG 并关 console/show-sql 属配置基线待办。
- **连接池待办**：M48-A afterEach pump 根因根治（bun 升级后复核）；其余长驻演示内存聚合器跨轮残留持续观察。
- **工具链待办**：web 独立 TS 5.6.3 与根 TS 6.0.2 版本对齐需专项评估 antd5 / React19 / vitest 兼容回归后再决策；bun 1.2.0 路径子串匹配误纳 web 待升级 ≥1.2.10 前缀锚定根治。
- **代码质量待办**：存量 `any` 收窄；生产裸 `console.log` 迁结构化日志；未使用导出 / 死代码跨文件扫描；server.ts 剩余不可考注释乱码；存量 3000+ lint error 分布与处置持续跟踪。
- **未入库产物**：本轮临时探针 / 扫描件 / 备份 / 历史 patrol 切片（`_rep11_*`、`_rep10_*`、`_rep9_*`、`_rep8_*`、`_probe*`、`_seed_*`、`_ddl_probe*`、`_mig_probe*`、`_sweep*.ps1`、`_serial_rep.ps1`、`schema-backup-*.sql`、`eslint_*.json`、`docs/TODO_LEDGER.md`、`scripts/_*.py` 一次性 codemod 脚本、20261103–20261117 切片与 round1-3、two-hour 历史切片）不入库；docs CRLF→LF 历史漂移不专门提交。

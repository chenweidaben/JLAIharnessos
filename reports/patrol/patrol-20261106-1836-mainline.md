# 健澜仓库两小时滚动巡检简报（2026-11-06 18:36 轮）

- 巡检时间：2026-11-06 18:36–19:05（UTC+8，星期五）
- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- 基线（起点）：`4cb895c6`（组织智能体 P5-20 收口，8 个提交）
- 本轮终点：`7019a233`（本轮新增 3 个提交）
- 执行口径：组织侧自报门禁一律视为不可信，全部独立复跑

## 一、智能体进度

| 项 | 实测值 |
|---|---|
| 组织智能体 | `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级） |
| 状态 | status=2，finished/completing，90% |
| 版本 | 645，updated_at=1793958246 |
| 自报剩余 | 品牌扫描 + 简报 + 最终报告 3 项 |
| 实物核对 | 提交链已到 `4cb895c6`，最终报告已发出，`reports/patrol/patrol-20261106-1807.md` 已落盘 |

结论：组织侧自报与实物存在口径差（"剩 3 项"与"已产出 8 提交 + 最终报告"矛盾），但不影响本轮收口；已随本轮唤醒下达纠偏。

## 二、工具链与编译门禁（实测）

| 项 | 结果 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（`C:\Users\lenovo\.bun\bin\bun.exe`，未注册 PATH） |
| npm | 10.9.8 |
| 根 tsc `node node_modules/typescript/bin/tsc --noEmit` | **exit 0 / 0 字节**（修复前后各跑一次，均 0） |
| web tsc `bun x tsc --noEmit`（cwd=web） | **exit 0 / 0 字节** |

## 三、单测（11 文件，独立复跑）

- 首次复跑：**153 tests / 148 pass / 5 fail / 428 expect / 13.19s**
  - 5 个 fail 集中在 `P5-13 PgAuditStore fake executor`，报错统一为
    `TypeError: this.sql.unsafe is not a function`
  - 根因：组织侧 `d1cb4b8a` 引入 `AUDIT_DB_SCHEMA` 后 `PgAuditStore` 改用 `sql.unsafe()`
    拼全限定表名，而单测 fake executor 只实现了模板标签形态
  - **组织侧"全绿"自报未覆盖此文件，属假绿**
- 修复（保留产品实现，补类型与测试契约）：
  1. `PgSql` 接口显式声明 `unsafe(fragment: string): unknown`，去掉 `as any`
  2. schema 白名单正则 `^[a-z_][a-z0-9_]+$` → `^[a-z_][a-z0-9_]*$`（单字符 schema 合法）
  3. fake executor 补 `unsafe` 原样返回 + `unsafeCalls` 记录；`capturedSql` 改为按真实渲染内联 values
  4. SQL 契约断言改为 `INSERT INTO "audit"."events"` + `audit_events_seq_audit`
  5. 新增用例：`audit_e2e` 全限定标识符 + 注入式 schema 拒绝构造
- 修复后复跑：**154 pass / 0 fail / 445 expect / 12.77s**

## 四、E2E（隔离实例）

| 轮次 | 结果 | 说明 |
|---|---|---|
| r1 | 22 pass / 1 fail / 1 error | `worm-e2e-setup.ts` 用 `spawn('bun')`，本机 PATH 无 bun → ENOENT，隔离实例未起，测试回落到默认 8080 **生产实例**；`P5-6-dump` 显示 total=1824（生产审计事件），隔离名不副实 |
| r2（修复后） | **23 pass / 0 fail / 6.68s** | `P5-6-dump` total=16、newestSeq=16（3 条种子 + 自造段），证明确实在 8081 + `audit_e2e` 隔离 schema 上执行 |

修复：`startBff` 改用 `process.execPath`（bun test 下即 bun 可执行文件），保留 `BUN_BIN` 覆盖。

## 五、品牌脱敏（独立复扫）

| 项 | 值 |
|---|---|
| filesScanned | 9815 |
| termCount | 24（四套词表） |
| termsWithHits | `gangos` |
| totalHits / hitFiles | 13 / 2（`src/bff/observability/metrics.ts` 7 处、`src/core/observability/metrics.ts` 6 处） |
| 硬违规 | **0** |

`gangos_` 仅为 Prometheus 指标前缀与注释，按既定口径计入 backlog，不计硬违规。

## 六、路由与运行态

- 路由：lazy import 2865 条全解析（MISSING 0、package 0）；route path 2870 条重复 0；elements 2769 个 undefined 0
- 端口：
  | 端口 | 进程 | 归属 |
  |---|---|---|
  | 8080 | pid 45332（bun `src/bff/server.ts`） | 本仓 BFF（本轮重启，`HTTP_PORT=8080`、`AUDIT_BACKFILL_LIMIT=10000`） |
  | 5174 | pid 37772（node） | 本仓 vite 工作台 |
  | 5173 | pid 41116（node） | 外部沙箱 vite，非本仓 |
  | 8000 | pid 12744（python） | 他项目 uvicorn |
  | 8081 | 已清理 | E2E 隔离实例 |
- 端点实测（7/7 = 200）：`/health`、`/ready`、`/api/v1/health`、`/api/v1/system/health`、`/metrics`、`5174/`、`5174/login`
- `/ready` 返回：`auditStore=pg`、`wormBackend=memory`、`sealDisabled=false`

## 七、本轮 P0：`380-consult-threads.sql` 让 `DEMO_MODE=0` 迁移失败（已修）

- 位置：`deploy/postgres/init/380-consult-threads.sql`，列名 `current_role` 未加双引号。
  `current_role` 是 PostgreSQL 保留字（niladic 函数），**解析期**即语法错误。
- 影响：`DEMO_MODE=1`（跳过 PG 连接）可起，`DEMO_MODE=0`（生产路径）迁移在 380 处整体失败、BFF 启动退出。
- 修复：列名与 CHECK 内引用统一加双引号，并注释保留字原因。
- 真库实测（事务内，随后 ROLLBACK，脚本 `logs/verify-380-sql.mjs`）：
  - A 负向对照：未加引号 → 复现 `语法错误 在 "current_role" 或附近的`（根因唯一性确认）
  - B 加引号 → accepted
  - C 整文件执行 → parsed & executed OK
  - D ROLLBACK 后 `to_regclass('consult.threads')` = null（无持久残留）

## 八、全量迁移预检（生产路径可执行性）

- `public.schema_migrations`：files=355 / applied=349 / **pending=6**
- pending 全部为 consult 系列：`380`、`381`、`382`、`383`、`384`、`385`
- 整链事务内执行：**6/6 OK**，随后 ROLLBACK（脚本 `logs/verify-pending-chain.mjs`）
  → 修复 380 之后，下一轮 `DEMO_MODE=0` 启动的迁移链已具备可执行性
- 逐文件 42601 语法扫描（355 文件）：21 处报错，其中
  - 15 个为文件带 UTF-8 BOM 造成的扫描器假阳性（`51`、`185`–`199`）
  - 5 个为**已应用**文件的潜在语法债：`273-teaching.sql`（`attendance_date date date`）、
    `291-performance-indexes.sql`（注释续行以 `||` 开头）、`297`/`338-medical-graph-deep.sql`、
    `90-pgvector-optional.sql`（以 MySQL 风格 `#` 注释开头）
  - 上述 5 个已在 schema_migrations 登记，启动路径会跳过，**不构成本轮 P0**；是否为文件被后续编辑破坏，列入下轮复核

## 九、本轮提交与双仓推送

| 提交 | 内容 |
|---|---|
| `83f49adf` | fix(audit)：PgSql.unsafe 声明 + 白名单放宽 + 单测 fake executor 与契约补强 |
| `b6450b3e` | fix(db)：380-consult-threads `current_role` 加双引号 |
| `7019a233` | fix(e2e)：自管 BFF 改用 process.execPath，避免 PATH 缺 bun 时回落生产实例 |

组织侧 8 个提交（`22ea5576..4cb895c6`）随本轮一并推送。

推送结果（不推 origin / heagentos，不打 tag）：

| 仓 | 命令 | 结果 |
|---|---|---|
| gitcode | `git push gitcode consult-agent-m86:master consult-agent-m86` | exit 0 |
| mirror | `git push mirror consult-agent-m86:master consult-agent-m86` | exit 0 |

四 ref 核对（`git ls-remote`）：

| 端 | `refs/heads/master` | `refs/heads/consult-agent-m86` |
|---|---|---|
| 本地 HEAD | `7019a23388bc45845663731ba66c2d737c8d3d53` | — |
| gitcode | `7019a23388bc45845663731ba66c2d737c8d3d53` | `7019a23388bc45845663731ba66c2d737c8d3d53` |
| mirror | `7019a23388bc45845663731ba66c2d737c8d3d53` | `7019a23388bc45845663731ba66c2d737c8d3d53` |

四 ref 逐位一致。

## 十、仓库卫生

- tracked 修改：0（本轮 3 个改动已全部入库）
- untracked：39 项，全部为另一路 consult 任务的巡检简报，按纪律不代提交、不删除
- 根目录 2123 个 `.txt`/`.log` 探针与日志均被 `.gitignore`（`*.log` 等规则）覆盖，不入库

## 十一、遗留风险与下一轮重点

1. **`DEMO_MODE=0` 未真实启动验证**：本轮只做到"事务内整链可执行 + 回滚无残留"，没有真跑一次生产模式启动（会真实创建 6 张 consult 表）。下轮建议在可控窗口内实测一次。
2. **5 个已应用迁移的语法债**（273/291/297/338/90）：启动会跳过，但 admin 手动单文件重跑会失败，需单独复核并修。
3. **E2E 隔离 fail-open 残留**：根因（bun 不在 PATH）已修，但 `BASE` 仍默认回落 `8080`；若 `startBff` 再次失败，测试仍会在生产实例上假绿。建议把 `BASE` 硬绑 `handle.baseUrl`。
4. `seal` 响应 `sourceChainValid:false`（历史现象）仍未定性是否属缺陷。
5. `wormArchiveAggregator.ts:86` 的 `no-unsafe-argument` 抑制仍缺理由注释。
6. 五项配置决策待用户拍板：`layered.put` 断网兜底、`AUDIT_DB_SCHEMA` 优先级、`/ready` 非生产 `degraded`、`WORM_BACKEND` 默认 `fs`、演示环境明文口令风险取舍。
7. 更早遗留：`docs/**` 历史商业分析文档厂商真名专项脱敏、`gangos_` 13 处指标前缀是否清理、PG 备份表 drop、2403 误纳入对象 rewrite、根目录历史探针清理、本地 master 清理。

## 十二、本轮结论

- 双 tsc 0/0、单测 154/0、E2E 23/0（真隔离）、品牌硬违规 0、路由 0 悬空 —— 五条门禁本轮全部实测通过。
- 阻断生产路径的 P0（`current_role` 保留字）已修复并用真库负向对照取证；待应用迁移整链验证通过。
- 组织侧"单测全绿""E2E 全绿"两项自报均与实测不符，已定位为测试契约未跟上产品改动、以及测试用裸 `bun` 启动，均已就地修复。

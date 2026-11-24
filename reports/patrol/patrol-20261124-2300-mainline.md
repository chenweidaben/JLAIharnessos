# 巡检简报 2026-11-24 23:00 轮（定时唤醒 · medmuse 角色约束/种子顺序理顺 · cashier/dept_head 角色注册对齐 · unit 剩余 fail/error 剥离复核）

## 概要
定时巡检唤醒后继续收口 `consult-agent-m86` 分支后端专项。本轮只推进不依赖架构拍板的独立工程项：①理顺 206 medmuse 角色约束/种子顺序——把 finance 允许集合的 CHECK 扩展前置到 finance 种子 INSERT 之前，空库按编号重放不再先违反 200 旧 CHECK；②补齐 `cashier`（同类缺口 `dept_head`）在 DB 角色种子、后端白名单/权限映射与前端角色字典/类型的登记，前后端角色码对齐；③在 16653 pass / 169 fail / 113 errors 基线上剥离复核剩余 fail/error，逐条甄别为 Bun 1.2.0 web 目录误纳或并行污染，未发现新的真实后端缺陷。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板，拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest 2.1.9
- 后端 BFF/TS：仓库根 `bun test tests/unit` + `tsc --noEmit`；前端：`web/` 目录 `tsc --noEmit` + `vitest run`
- DB：本地 postgres 常驻 `127.0.0.1:5433/jlmedaios`（trust 无密码）；`public.schema_migrations` 已记账 350 / init 355 个 SQL，未记账 5 个（256 / 339 / 349 / 350 / 369）
- 基线 HEAD：`e5024a3a0b3adefd236540277372ff2d0141d1fe`（三远端 origin/gitcode/mirror 逐字一致、ahead/behind 0/0）

## 本轮代码 / 种子 / 前端改动
| 文件 | 类型 | 说明 |
|---|---|---|
| `deploy/postgres/init/206-medmuse-insurance.sql` | fix(seed) | finance 种子 INSERT 前新增幂等约束扩展段：`DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT ... CHECK (role_code IN (200 原 6 码 ∪ finance 全并集))`。本文件是首个写入 finance 种子的迁移，必须先放开允许集合再插种子；枚举取全并集（ADD CONSTRAINT 校验既有行，不能只写 finance）。209-phase3 保留同口径幂等扩展兜底。 |
| `deploy/postgres/init/10-iam.sql` | fix(seed) | 内置角色种子补 `cashier`（收费员）、`dept_head`（科主任），`ON CONFLICT (code) DO NOTHING`。消除 `user_roles.role_code` → `iam.roles(code)` 外键缺口；纯字典登记，不动上线契约。 |
| `web/src/types/adminUser.ts` | fix(web) | `AdminRoleCode` 联合类型补 `ams_officer / finance / cashier / dept_head`，与 `iam.roles` 种子码对齐；同步顶部注释。 |
| `web/src/store/userAdminStore.ts` | fix(web) | `ADMIN_ROLE_OPTIONS` 字典补 `ams_officer / finance / cashier / dept_head` 中文名，用户管理后台可分配角色与 DB 种子一致。 |
| `web/src/types/auth.ts` | fix(web) | 前端展示码 `RoleCode` 联合类型补 `cashier / dept_head`，对齐后端 `toRoleCode` 输出。 |

## 专项① medmuse 角色约束/种子顺序（空库实测通过）
- 根因链：`200-medmuse-core.sql` 建表 `clinical.medmuse_agents`，原始 `role_code` CHECK 仅 6 码（`attending/resident/nurse/pharmacist/medical_director/patient`，无 finance）；`206-medmuse-insurance.sql` 是首个写入 finance 种子的迁移，而约束扩展原本在编号更晚的 `209-medmuse-phase3.sql` 才做。空库按编号顺序重放时，206 插 finance 会先违反 200 旧 CHECK；本地库因历史手工约束已扩展而能通过。
- 修法：206 在 finance 种子 INSERT 之前幂等扩展 CHECK 到 7 码并集；209-phase3 同口径兜底。
- 空库实测（临时库 `jlmedaios_probe`，复用迁移器真实分词器 `splitSqlStatements`、每文件单事务，与迁移器语义一致）：按编号顺序重放 `01-extensions → 02-schemas → 10-iam → 20-clinical → 21-diagnoses → 22-inpatient → 200-core → 204-nurse → 205-pharmacist → 206-insurance → 209-patient → 209-phase3`，**全部 OK**；`medmuse_agents` 落库 7 角色码 `attending/finance/medical_director/nurse/patient/pharmacist/resident`，`iam.roles` 含 `cashier/dept_head`。实测后临时库已 DROP 清理。
- 种子角色码核对：6 个 medmuse 种子文件（200/204/205/206/209-patient/209-phase3）写入的 `role_code` 全部落在 7 码并集内；204/205 早于 206 扩展，所插 `nurse/pharmacist` 均在 200 原 6 码内，不违约。

## 专项② cashier / dept_head 角色注册与一致性核对
- 鉴权口径：登录后权限集合由应用层 `ROLE_PERMISSIONS` 内存映射展开（`userView.ts buildAuthView`：`rawRoles.flatMap(r => ROLE_PERMISSIONS[r] ?? [])`），DB `iam.role_permissions` 为院方可选维护层，不参与登录鉴权。
- 后端既有映射（本轮未改，核对一致）：
  - `ROLE_PERMISSIONS.cashier`：`dashboard:view / report:finance:read / patient_billing:read|write|refund|report / fee:audit:view / settlement:view / medmuse:chat`；`dept_head` 由 doctor 列表展开 + `dept:manage / quality:dept:view / quality:dept:approve`。
  - 登录角色白名单 `server.ts STAFF_ONLY_ROLES`：`doctor/nurse/pharmacist/technician/ams_officer/finance/admin/dept_head/cashier`，已含两者。
  - 业务聚合器/路由：`patientBillingAggregator.STAFF_ROLES` 含 cashier；`inpatientDepositSettleTrade` JWT 直判 cashier/finance/admin；`adminMUSEV2/officeDeep` 聚合器与测试引用 dept_head。
- DB 字典缺口（本轮补齐）：`iam.roles` 种子原缺 `cashier/dept_head`；`user_roles.role_code` 有 FK→`iam.roles(code)`，真实授角色会外键报错。`ams_officer` 由 `95-ams.sql` 种子插入、`finance` 由 `10-iam.sql` 种子插入，前端字典本轮一并对齐。
- 前端对齐：管理后台 `AdminRoleCode` 类型 + `ADMIN_ROLE_OPTIONS` 字典补齐 4 个非基础角色；展示码 `RoleCode` 补 `cashier/dept_head`。
- 未做：DB `iam.role_permissions` 未为 cashier/dept_head 批量镜像内存权限矩阵——权限以应用层 `ROLE_PERMISSIONS` 为准，DB 授权行为院方可选维护层；是否改以库为准属另立改造，不在本轮范围。

## 专项③ unit 剩余 fail/error 剥离复核（与基线逐字一致，无新真实后端缺陷）
基线口径 `bun test tests/unit`：**16653 pass / 169 fail / 113 errors**，16822 tests / 2245 files，144.54s，退出码 1；与上轮基线 **16653 / 169 / 113 逐字一致**。

错误消息聚类（本轮取证 `_rep4_unit.txt`）：

| 类别 | 计数 | 归属 | 判定 |
|---|---|---|---|
| `vi.mock is not a function` | 90 | web/tests 误纳 | Bun 1.2.0 无 Vitest `vi` 命名空间；前端测试应由 web 目录 vitest 运行 |
| `Can't find variable: window` | 31 | web/tests 误纳 | 浏览器全局缺失 |
| `vi.useRealTimers / vi.useFakeTimers is not a function` | 23 + 4 | web/tests 误纳 | Vitest 定时器 API 缺失 |
| `Can't find variable: HTMLAnchorElement / document` | 4 + 3 | web/tests 误纳 | 浏览器 DOM 全局缺失 |
| `db.unsafe is not a function` | 6 | BE 并行污染 | 见下，单独跑全绿 |
| `error: boom` | 1 | 噪声 | 用例内主动抛错样例断言 |

- **BE 候选单独复核（全绿，并行污染非真实缺陷）**：
  - `tests/unit/medical-tools/getDrugInfo.test.ts`：单独跑 **4 pass / 0 fail**（exit 0）。
  - `tests/unit/knowledge/searchMedicalKnowledge.test.ts`：单独跑 **9 pass / 0 fail**（exit 0）。
  - `tests/unit/bff/agents/shared/clinicalReportInterpretation.test.ts`：单独跑 **5 pass / 0 fail**（exit 0）。
  - 6 条 `db.unsafe is not a function` 堆栈归属上述前两个文件。根因：多个 unit 文件在进程内改写 `process.env.DEMO_MODE`（置 `'0'` / `delete`），Bun 1.2.0 同进程并发下环境变量跨文件共享污染；某文件把 DEMO_MODE 置非演示后，药品工具用例 `isDemoMode()=false` 误入真实库分支，而主池句柄在并发重置下缺少 `unsafe` 方法。生产 `getDb()` 返回完整 postgres.js Sql（具备 `unsafe`），生产路径正常；单独跑各文件 DEMO_MODE 稳定为 `'1'`，走内存目录不打库，故全绿。
- **113 errors 归属**：`web/tests/**` 下共 **114 个**测试文件被 Bun 1.2.0 子串包含匹配误纳（`bunfig.toml` `pathIgnorePatterns` 在 filter 命中后不二次剪枝，issue oven-sh/bun#5969，前缀锚定自 1.2.10 起修复）；BE 非 web 目录 **0 条**文件级加载错误痕迹。errors 即这批 web 模块在 Bun 下的加载/执行失败。
- 结论：剩余 fail/error 全部归类为 web 误纳或并行/环境污染，未发现被掩盖的真实后端缺陷。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 后端 `tsc --noEmit` | **退出码 0**，无类型错误 |
| 前端 `web/ tsc --noEmit` | **退出码 0**，无类型错误 |
| 全量 `bun test tests/unit` | **16653 pass / 169 fail / 113 errors**，16822 tests / 2245 files，144.54s，**退出码 1**；与基线逐字一致，无新增回归 |
| 前端 vitest 受影响文件（userAdminStore / user-management-page） | **23 pass / 0 fail**，**退出码 0** |

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep 须等架构/用户拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填历史数据。真实受限流 BFF 起服被这 5 个迁移阻断，HTTP 层 429 实测暂不具备前提，门控正确性以 31 条限流/锁定单测为准，未伪造触顶结果。
- **369 空转**：`ops_metric` 新列 / `v_ops_trend` 视图缺快照回写与调度；**350** 规则引擎仍走旧 `meta.dq_rules / dq_runs / dq_results`，新表 `meta.data_quality_rule` 无 SQL 读写。均待选型拍板后落地。
- **测试隔离技术债**：多 unit 文件进程级改写 `DEMO_MODE`，并发下跨文件污染；根治方向为用例内 env 变更加隔离快照/串行，或升级 Bun ≥1.2.10 前缀锚定根治 web 误纳。本轮未改动测试并发模型。
- 本轮临时预检脚本 / 取证 `.txt` / `.ts` 与 schema-backup 备份不入库；docs CRLF→LF 历史漂移不纳入提交。

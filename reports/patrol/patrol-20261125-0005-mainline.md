# 巡检简报 2026-11-25 00:05 轮（定时唤醒 · role_permissions 一致性偏差评估 · 独立小债排查对齐 · BE 候选串行复核）

## 概要
定时巡检唤醒后继续收口 `consult-agent-m86` 分支后端专项。本轮只推进不依赖架构拍板的独立工程项：①评估 DB `iam.role_permissions` 授权行与应用层内存 `ROLE_PERMISSIONS` 矩阵的现状偏差，确认运行时鉴权以内存为准、DB 行仅管理后台展示；全量镜像属"改为以库为准"的语义改造，前置三条件未具备，**本轮不落地镜像**，偏差表与影响面如实记入 `docs/permission-audit-m183.md` §7。②扫描种子/字典/角色码/类型定义/测试隔离钩子/文档注释中与 `cashier / dept_head / finance / ams_officer` 相关的遗漏口径，前后端与白名单逐项对齐，未发现需落盘的新缺陷。③低峰串行复核此前归类并行污染/误纳的三个后端候选文件，单独进程复跑全绿，取真实退出码留痕。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板，拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest 2.1.9
- 后端 BFF/TS：仓库根 `bun test tests/unit` + `tsc --noEmit`；前端：`web/` 目录 `tsc --noEmit`
- DB：本地 postgres 常驻 `127.0.0.1:5433/jlmedaios`（trust 无密码）；`public.schema_migrations` 已记账 350 / init 355 个 SQL，未记账 5 个（256 / 339 / 349 / 350 / 369）
- 起点基线 HEAD：`6cb8699345958eb314deddf65004e0a2c8491f79`（三远端 origin/gitcode/mirror 逐字一致、ahead/behind 0/0）
- 本轮交付 HEAD：`6839dfdeaf240d6252b17185fdd3ebd394817632`

## 本轮代码 / 文档改动
| 文件 | 类型 | 说明 |
|---|---|---|
| `docs/permission-audit-m183.md` | docs(audit) | 新增 §7「DB `iam.role_permissions` 与内存矩阵偏差评估」：现状口径、11 角色偏差量化表、36 个未登记字典码、影响面、镜像可行性结论（待决策不落地）；§7 末尾注明 M183 §1.1 注 48/49 的 cashier/dept_head 内存/白名单/字典缺口已收口，DB 授权行缺口见 7.2。 |

本轮**无**源码、种子、前端、测试落盘改动；任务②排查结论为既有口径已对齐，不产生新文件。

## 专项① role_permissions 一致性镜像评估（只评估，不落地）
- 鉴权链路核对：运行时鉴权完全不读 DB `role_permissions`。JWT `permissions` 由 `buildAuthView` 按内存 `ROLE_PERMISSIONS[role]` 扁平合并签发（`userView.ts:539`、`auth.ts:333`）；`requirePermissionCode` 比对 JWT `payload.permissions`（`middleware/auth.ts:321`，含分组码首段通配命中）。DB `role_permissions` 仅被 `roleAdminRepo` 用于管理后台「角色管理」列表/详情的权限码展示与编辑（`loadRolePermissions` 93-106 行；`replaceRolePermissions`/`createRole` 写入前 `assertPermissionsExist` 做 FK 校验）。
- DB 实测现状：9 角色有授权行（admin 346 / doctor 220 / nurse 140 / pharmacist 37 / patient 16 / technician 21 / ams_officer 3 / researcher 2 / finance 2）；`cashier`、`dept_head` 为 0 行；无孤儿授权行；`iam.permissions` 字典 356 码。
- 偏差量化（本地库实测，内存码数 / DB 行数 / 内存有DB无 / DB有内存无 / 内存码不在字典）：

| 角色 | 内存码数 | DB 授权行 | 内存有/DB无 | DB有/内存无 | 内存码不在字典 |
|---|---:|---:|---:|---:|---:|
| admin | 289 | 346 | 29 | 86 | 28 |
| doctor | 196 | 220 | 24 | 48 | 19 |
| pharmacist | 27 | 37 | 6 | 16 | 5 |
| nurse | 130 | 140 | 21 | 31 | 14 |
| technician | 27 | 21 | 6 | 0 | 2 |
| ams_officer | 8 | 3 | 5 | 0 | 2 |
| researcher | 6 | 2 | 4 | 0 | 0 |
| patient | 6 | 16 | 0 | 10 | 0 |
| finance | 7 | 2 | 6 | 1 | 1 |
| cashier | 9 | 0 | 9 | 0 | 7 |
| dept_head | 199 | 0 | 199 | 0 | 22 |

- 两套矩阵非简单子集：DB 冗余行多为旧版 V13 报表码、深水区 `*_deep:*`、已收敛/下线码；内存有 DB 无多为 v5.0 试点新增临床/急诊/护理/结算码。
- 内存矩阵中有 **36 个去重权限码未登记进 `iam.permissions` 字典**（镜像会触发 `role_permissions.permission_code` 外键 23503 失败）：4 个报表分组码 `report:clinical/admin/finance/quality:read`，以及 `inpatient:*`、`emergency:*`、`nursing:*`、`ward_round:*`、`inpatient_order:*`、`pharmacy:view/review`、`inventory:view`、`patient_billing:*`、`fee:audit:view`、`settlement:view`、`dept:manage`、`quality:dept:*`、`dept_cockpit:view`、`emr_level5:view`、`system:view` 等。
- **结论（待决策，本轮不落地）**：全量镜像前置三条件未具备——①补 36 码进字典；②决策 DB 冗余旧码去留；③定运行时事实来源（继续内存为准还是切以库为准，切换需改 `buildAuthView`/JWT 签发口径并补回归）。拍板前不写 DB 授权行、不补字典、不清冗余，维持现状运行时行为不变。

## 专项② 独立小债排查（逐项对齐，无落盘改动）
- **后端鉴权链路（核对一致）**：
  - `server.ts:6701` `STAFF_ONLY_ROLES` 含 9 staff 角色 `doctor/nurse/pharmacist/technician/ams_officer/finance/admin/dept_head/cashier`（researcher/patient 不在 staff）。
  - `agentRegistry.ts:10` `MedmuseRoleCode` 7 码 `attending/resident/nurse/pharmacist/medical_director/finance/patient`，与 DB `clinical.medmuse_agents` 角色并集一致；此为 medmuse 会话角色空间，cashier/dept_head 不属此空间。
  - `patientBillingAggregator.ts:37` `STAFF_ROLES` 含 cashier；其余 `requireRole` 多为 admin 专用路由或业务域内角色（patient/surgeon/icu_doctor 等），与 iam 登录角色不同空间。
- **前端（核对一致）**：`web/src/types/adminUser.ts` `AdminRoleCode` 11 码齐全；`web/src/store/userAdminStore.ts` `ADMIN_ROLE_OPTIONS` 含 ams_officer/finance/cashier/dept_head；`web/src/types/auth.ts` `RoleCode` 含 cashier/dept_head。
- **个人 MUSE 主页岗位映射（不同角色空间，非缺口）**：`web/src/pages/muse/Home/index.tsx` 独立 `ROLE_LABEL` 仅 `doctor/nurse/pharma/admin`；其 `profile.role` 类型为后端 `staffMuseAggregator.ts:22` 的 `StaffMuseRole = 'doctor'|'nurse'|'pharma'|'admin'` 4 枚举，属个人 agent 学习路径空间，与 iam 登录角色体系独立；`museLesson.ts deriveStaffRole` 兜底 `admin`。cashier/dept_head/finance/ams_officer 不属此枚举空间，映射既有设计正确，未补码。
- **种子/字典/CHECK 枚举（核对一致）**：`239-staff-muse.sql` 岗位 CHECK、`200/206/209` medmuse 会话角色 CHECK、`267-oa-approvals` `final_role IN ('hr','finance')`（finance 在列）、`306` 排班角色、`60/381` 聊天角色等均为独立业务空间枚举，与 iam 登录角色不同体系，无需补 cashier/dept_head。`165-180` 等历史业务迁移给既有角色授 DB 权限行，按任务①结论属可选维护层，本轮不动。
- **权限校验脚本**：`scripts/verify-p1-permission.ts` 期望角色表已含 ams_officer/dept_head/finance/cashier，实际权限从 `ROLE_PERMISSIONS` 读取，无需同步。
- **测试隔离钩子（核对无漏还原）**：改写 `DEMO_MODE` 的 unit 文件（`prodDemoFailClosed`/`sessionRuntime`/`medmusePersist`/`globalRateLimit`/`consultAgentRepo`/`mockScope`/`wormKeyProvider`/`wormKeysRoutes`）均有 before/after 快照恢复钩子；并发跨文件污染属 Bun 1.2.0 同进程并发模型债，本轮不改造测试并发模型。

## 专项③ 低峰串行复核后端候选（单独进程全绿，退出码 0）
| 测试文件 | 结果 | 退出码 |
|---|---|---:|
| `tests/unit/medical-tools/getDrugInfo.test.ts` | **4 pass / 0 fail**（15 expect） | **0** |
| `tests/unit/knowledge/searchMedicalKnowledge.test.ts` | **9 pass / 0 fail**（23 expect） | **0** |
| `tests/unit/bff/agents/shared/clinicalReportInterpretation.test.ts` | **5 pass / 0 fail**（19 expect） | **0** |

三文件均以独立 Bun 进程串行复跑，与上轮归类结论一致：此前的 `db.unsafe is not a function` 为多文件并发改写 `DEMO_MODE` 跨进程环境污染，非真实后端缺陷。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 后端 `tsc --noEmit`（仓库根） | **退出码 0**，无类型错误 |
| 前端 `web/ tsc --noEmit` | **退出码 0**，无类型错误（首跑偶发 TS5103 冷启动抖动，复跑两次均干净退出 0） |
| BE 候选三文件单独 `bun test` | 4/0、9/0、5/0，**退出码 0** |

## 提交与双平台同步（本轮实测）
- 提交：`6839dfde` `docs(audit): M183 §7 DB role_permissions 与内存矩阵偏差评估`（1 file，45 insertions / 1 deletion）。
- 推送：origin / gitcode / mirror 三远端 consult-agent-m86 均 `6cb86993..6839dfde`，推送退出码 0。
- `git ls-remote` 逐字核对：三远端 SHA = 本地 HEAD `6839dfdeaf240d6252b17185fdd3ebd394817632`；`rev-list --left-right --count` 三远端 behind/ahead = **0 / 0**。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **role_permissions 全量镜像待拍板**：补 36 缺字典码、清 DB 冗余旧码、定运行时事实来源三条件需架构/用户拍板；本轮已按"不改变上线行为"记录偏差，未写 DB 授权行/未补字典/未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep 须等架构/用户拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填历史数据。真实受限流 BFF 起服被这 5 个迁移阻断，HTTP 层 429 实测暂不具备前提，门控正确性以现有 31 条限流/锁定单测为准，未伪造触顶结果。
- **369 空转**：`ops_metric` 新列 / `v_ops_trend` 视图缺快照回写与调度；**350** 规则引擎仍走旧 `meta.dq_rules / dq_runs / dq_results`，新表 `meta.data_quality_rule` 无 SQL 读写。均待选型拍板后落地。
- **测试隔离技术债**：多 unit 文件进程级改写 `DEMO_MODE`，并发下跨文件污染；根治方向为用例内 env 快照/串行，或升级 Bun ≥1.2.10 前缀锚定根治 web 误纳。本轮未改动测试并发模型。
- 本轮临时预检脚本 / 取证 `.txt` / `.ts` / `.sql` / `.ps1` 与 schema-backup 备份不入库；docs CRLF→LF 历史漂移不纳入提交。

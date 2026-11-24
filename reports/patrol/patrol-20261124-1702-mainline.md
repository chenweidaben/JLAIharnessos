# 巡检简报 2026-11-24 17:02 轮（定时唤醒 · 工单 patient_id 收口 / consult uuid 守卫 / init DDL 缺陷批量修复 / Bun 升级评估）

## 概要
定时巡检唤醒后继续收口 `consult-agent-m86` 分支后端专项。本轮按上轮遗留 5 项推进：①工单表 `clinical_improvement_tasks` 补 `patient_id` 列并对齐患者级查重写路径；②consult 错误分支非 uuid 句柄在仓储读路径前置拦截，主键生成改标准 RFC4122 uuid，修正 `current_role` 关键字裸引用；③真实模式 integration 剩余 fail 仅完成 consult 两文件归类，全量 191 fail 待低峰逐文件隔离；④重放日志中 10 个确定性 DDL 缺陷修复并本地重放清零，4 个列结构漂移文件留契约对照专项；⑤Bun 升级评估落定：本轮不跨大版本升级，继续 ignore 兜底。改动拆分 3 个提交推送 GitCode origin/gitcode 与 GitHub mirror 三远端，`git ls-remote` 逐字核对 SHA 与本地 HEAD 一致、领先/落后 0。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest v2.1.8
- 后端 BFF/TS：仓库根 `bun test` + `tsc --noEmit`；前端：`web/` 目录 `vitest run`
- DB：本地 postgres 常驻 `127.0.0.1:5433/jlmedaios`（trust 无密码），当前 469 表；重放前已 `pg_dump -s` 备份结构

## 本轮代码与 DDL 改动（3 个提交，已推送三远端）
| SHA | 类型 | 说明 |
|---|---|---|
| `b2f14ff1` | fix(db) | 工单表补 `patient_id` 列并对齐患者级查重写路径 |
| `bf70525a` | fix(consult) | 主键改标准 uuid 并前置拦截非法句柄，修正 `current_role` 关键字引用 |
| `7565bbbb` | fix(db) | 修复 init DDL 重放缺陷（注释/类型/约束名/列名），10 个文件 |

### 待办 ① 工单表 patient_id（已收口）
- 现象：`clinical_improvement_tasks` 缺 `patient_id`，2 处 42703 来自测试 afterAll 清理 SQL（按 patient_id 删工单）。
- 根因：chronic/oncology/pain 三个聚合器把 `patientId` 误传给 `hasOpenTask` 的 `visitId` 形参，而建单 `visitId:null`，按 visit_id 查重永远落空、重复建工单。
- 落地：DDL 幂等补 `patient_id uuid NULL` + 患者级索引 `idx_improvement_patient(source, patient_id)`；`improvementTaskRepo.createTask` 输入加可选 `patientId` 并写入，TaskRow/map/全部 SELECT 与 CAS RETURNING 纳入 patient_id；`hasOpenTask` 加第四参 `opts?:{by?:'visit'|'patient'}`，by=patient 按 patient_id 查重；三个聚合器建单传 patientId 并按患者查重。
- 验证：本地 psql 重放 115 验证列与索引落库；真实模式复跑 chronicDisease+oncology **11 pass / 0 fail，exit 0**，42703 清零。

### 待办 ② consult 非 uuid 句柄（读路径已收口；写路径夹具遗留归类）
- 分层定性：仓储 mock 单测通过 `mock.module` 替换 getDb 注入假库，仓储层无法区分真实/假库，uuid 硬守卫若放仓储会冲垮 26 个 mock 单测的 SQL 构造与空结果映射断言。
- 落地：
  - `consultAgentRepo.ts` 6 个读方法（findThread/listThreads/listMessages/listDrafts/listAudit/getProfile/listDocuments）入口加 `isUuidHandle` 守卫，非法/空句柄短路返回 null/[]/空白画像，不绑定到 uuid 列；导出 `isUuidHandle` 供边界复用。
  - `saveThread` 的 `current_role` 是 Postgres 保留字（niladic 函数），DDL 380 已双引号但仓储 SQL 漏引号，裸写触发 42601；INSERT 列清单与 ON CONFLICT SET 均改为 `"current_role"`。
  - `roleSupport.newId` 原生成 `前缀_<12hex>`（如 `thread_491645b37c9d`），与 consult 六表 uuid 主键/外键漂移；改为 `randomUUID()`（RFC4122），prefix 形参保留兼容但不进值。
  - 单测同步：`consultAgentRepo.test.ts` 夹具 `TEST_USER_ID/TEST_THREAD_ID` 及硬编码 `thread-002/thread-x` 改为合法 uuid；`audit.test.ts` 前缀断言 `/^audit_/` 改为 uuid 正则；仓储 SQL 列清单断言同步双引号形态。
- 验证：typecheck exit 0；consult-agent 单测 **210 pass / 0 fail**；db/bff 目录回归 **372 pass / 0 fail**。真实模式复跑 consult 两集成文件：22P02 从 9→0（读路径），42601=0；剩余 22P02=22 全部是测试夹具登录态 userId 句柄（`u-flow-m86`/`u-err-m86`/`u-err-other`）落 `threads.user_id` uuid 外键，27 个 fail 连锁源于此，定性为 **DEMO 测试夹具与真实 schema 不匹配**，非生产代码缺陷，归待办③环境适配。

### 待办 ④ 重放日志真实 DDL 缺陷（10 文件已修并本地重放清零；4 文件列漂移留专项）
已修并逐文件 psql 重放 errors=0：
- `90-pgvector-optional.sql:2`：shell 风格 `#` 注释 → SQL `--`。
- `273-teaching.sql:66`：列类型误写重复 `attendance_date date date` → `date`。
- `291-performance-indexes.sql`：4 处 `COMMENT ON INDEX` 误用 `||` 字符串拼接（Postgres COMMENT 不支持表达式）→ 合并单字面量；另 4 处索引注释未带 schema 限定（search_path 仅 `"$user", public`，索引在 clinical schema）→ 改为 `clinical.idx_xxx`。
- `292/294/296/299`：`double` 类型不存在 → `double precision`（参照 295 既有正确口径）。
- `297/338 medical-graph-deep`：约束名误带 schema 前缀（`clinical.xxx_check`，`.` 语法错）→ DROP/ADD CONSTRAINT 去掉 schema 前缀；COMMENT 误用 `||` → 合并字面量。
- `355-blood-deep.sql:96`：django 风格表名 `auth.permission` → `iam.permissions`，列补 NOT NULL 的 `module`（取值 `blood_deep`）。

### 待办 ⑤ Bun 升级评估（结论：本轮不升级，留痕）
- 事实核对：本机 Bun `1.2.0`；issue oven-sh/bun#5969 确认测试 filter 前缀锚定自 **Bun 1.2.10** 起支持 `bun test ./test` 形式；检索到最新稳定版 **v1.4.4**（2026-10-22 发布）。
- 不升级理由：
  1. 跨大版本 1.2.0 → 1.4.4，运行时行为变化面大；上轮已坐实 Bun 1.2.0 下 unref 的 setTimeout 回调不调度，新版本 timer 调度语义可能改变，需回归 ToolExecutor/超时相关单测。
  2. 本机工具链版本被锁定（Node v22.23.2 + Bun 1.2.0），全局 `bun upgrade` 影响所有项目。
  3. 升级收益当前不阻塞交付：web 误纳已有 `bunfig.toml` `pathIgnorePatterns` 多形态 glob 兜底，前端回归走独立 vitest 口径。
- 后续建议：低峰在隔离 Bun 版本验证 v1.4.4 全量门禁（unit 16822 + integration 1521 + vitest 1397）全绿后，再固化工具链版本；未升级前继续 ignore 兜底。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 后端 `tsc --noEmit` | **退出码 0**，无类型错误 |
| 后端 `bun test tests/unit` 全量 | 16653 pass / 169 fail / 113 errors，16822 tests / 2245 files，154.23s，**退出码 1**；与上轮基线 16653/169/113 **逐字一致**，无新增回归 |
| consult-agent 单测 | 210 pass / 0 fail，**退出码 0** |
| db/bff 目录回归 | 372 pass / 0 fail，**退出码 0** |
| chronicDisease + oncology 真实模式复跑 | 11 pass / 0 fail，**退出码 0**，42703 清零 |
| consult 两集成文件真实模式 | 20 pass / 27 fail；22P02=22（夹具 userId 句柄落外键），42601=0；fail 定性环境适配，非生产缺陷 |

## 推送与远端核对（本轮实测）
- 推送前：三远端均 `f3e3694e`，本地领先 3、落后 0。
- 推送：origin（https）`f3e3694e..7565bbbb`；mirror（ssh GitHub）`f3e3694e..7565bbbb`；gitcode（ssh）与 origin 同仓，up-to-date。ssh 仅 post-quantum 密钥交换告警，不影响连通。
- `git ls-remote` 逐字核对：
  - LOCAL `7565bbbb413b78dd434e59c8083adce72af32d4f`
  - origin `7565bbbb…` match=True；gitcode `7565bbbb…` match=True；mirror `7565bbbb…` match=True。
- `heagentos` 远端仅承载 main，不同步 m86 分支。

## 遗留待办（如实记录，未编造通过结论）
### 待办 ③ 真实模式 integration 191 fail 隔离归类（未完成）
- 仅 consult 两文件已归类（27 fail = 夹具 userId 句柄落 uuid 外键，DEMO 环境适配问题）。其余 integration 文件未逐文件隔离复跑。
- 待归类错误码：种子数据类 CHECK/FK/JSON 违规（194 category check、199/209 role_permissions FK、206 role_code check、209 invalid json、297:127 node_type check、339 room_type check ×4），以及业务状态机断言 / 409 冲突 / 权限口径。下一轮低峰逐文件隔离复跑，区分真实代码缺陷与环境/历史遗留。

### 待办 ④ 剩余 4 个列结构漂移 DDL 文件（需对照仓储/类型契约后再改，勿盲目补列）
- `349-satisfaction-deep.sql`：enum `clinical.pdca_phase` 不存在——实测 `pdca_phase` enum 建在 **medmuse** schema（349 的 DO 块按 typname 不查 schema 命中 medmuse 同名类型而跳过创建 clinical 版）；`clinical.satisfaction_surveys` 现有列与 349 深化列名不一致（现有 emotion_sentiment，缺 channel/emotion_label/emotion_score/five_why_chain/root_cause_code/pdca_phase/nps_category/benchmark_dept）；ADD COLUMN 因 enum 缺失整条回滚导致后续 COMMENT/索引级联报列不存在。
- `350-data-governance.sql`：本地 `meta.data_quality_rule` 是早期两套列结构（id/dimension/target_schema/target_column/check_type/threshold/params…），新文件用 governance_domain/target_field/rule_expression/threshold_pct/owner_role/remediation；CREATE TABLE IF NOT EXISTS 因表已存在跳过，索引/INSERT 找不到新列。
- `369-ops-analysis.sql`：本地 `medmuse.ops_forecast` 是旧结构（forecast_date/metric_name/predicted_value/lower_bound/upper_bound/residual_std/confidence_level/history_points/model_method），新文件结构（dept_code/dept_name/domain/metric_key/anchor_period/horizon/target_period/forecast_value/confidence/method）；ops_metric 本地列已齐全。
- `256-follow-up.sql:32/33`：报 `due_at`、`visit_id` 列不存在，尚未读源码核对。
- 决策约束：349/350/369 两套列结构以哪套为准，需对照对应 BFF 聚合器/仓储源码契约后决定补列还是改代码，不可凭 DDL 单方臆改。

### consult 写路径遗留
- saveThread/saveMessage/saveDraft/saveAudit/saveDocument/saveProfile 内部 id 已改 uuid，但测试夹具 userId 句柄适配（真实模式接入种子真 uuid 用户）未做；orders 单号 order_no 生成规则列为后续增强（契约可空）。

### 工作区既有不入库项
- docs 99+ 项 CRLF→LF 换行漂移（本轮 `docs/_m235_endpoints.txt`、`docs/_m235_scan.csv` 仍为历史漂移，未纳入提交）；reports/patrol 历史切片未跟踪；`.txt` 取证日志与 schema-backup 备份不入库；仅 mainline 简报按豁免命名入库。

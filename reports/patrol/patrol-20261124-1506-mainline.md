# 巡检简报 2026-11-24 15:06 轮（定时唤醒 · 后端 schema 补全 / timer 与时间注入收口 / orders DDL 对齐）

## 概要
定时巡检唤醒后继续收口 `consult-agent-m86` 分支后端专项。本轮完成：①本地 PG 按编号重放全量 init DDL，补齐上轮 60 张缺表并对齐 orders 仓储写/读路径列口径；②`ToolExecutor` 超时定时器与 abort 监听器终态后 finally 清理，消除残留泄漏；③`knowledgeRegistry.approve` 支持注入审批时间基准，消除季度评审日期漂移；④定位 Bun 1.2.0 web 目录排除失效根因并加固 ignore 模式；⑤区分 DEMO_MODE 环境问题与真实代码缺陷，在真实模式下复跑 integration 取基线。改动拆分 4 个提交推送 GitHub mirror 与 GitCode 三远端，ls-remote 逐字核对一致。前端全量 vitest 降并发复跑在后台进行，最终汇总以落盘日志为准。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest v2.1.8
- 后端 BFF/TS：仓库根 `bun test` + `tsc --noEmit`；前端：`web/` 目录 `vitest run`
- DB：本地 postgres 常驻 `127.0.0.1:5433/jlmedaios`（trust 无密码）；重放前已 `pg_dump -s` 备份结构

## 本轮代码与 DDL 改动（4 个提交，已推送三远端）
| SHA | 类型 | 说明 |
|---|---|---|
| `14defa04` | fix(tools) | ToolExecutor 超时定时器与 abort 监听器终态后 finally 清理，消除 timer/监听器残留泄漏 |
| `4797fe2a` | fix(knowledge) | approve 支持注入审批时间基准 approvedAt，消除评审到期日按运行当日推算的断言漂移 |
| `2a69f63b` | fix(db) | 对齐 orders 仓储写/读路径列口径；加固 Bun 测试 web 目录排除模式 |
| `ba52316c` | fix(db) | 补 orders.reviewed_by 列，对齐审核写路径列名漂移 |

### 待办 ⑤ ToolExecutor timer/监听器清理
- `executeWithTimeoutAndAbort` 重构为 try/finally：`Promise.race` 落定后 `clearTimeout(timer)` 清理挂起超时定时器，`signal.removeEventListener('abort', abortHandler)` 移除中断监听器。
- 保留"不对定时器 unref"约束：Bun 1.2.0 下 unref 的 setTimeout 回调不被调度，超时将永不触发（上轮已坐实）。
- 补回归用例：spy 全局 setTimeout/clearTimeout，断言工具快速成功后本次创建的 timer 被 clear。

### 待办 ② knowledgeRegistry.approve 时间注入
- `approve(id, approver, approvedAt?)` 新增可选第三参，缺省沿用 `nowIso()`；注入非空且 `Date.parse` 非法时抛 KB-001 校验错误。
- `resolvedApprovedAt` 贯穿 record、trail 与 `reviewDueAt` 计算；字段只增不删、向后兼容。
- 漂移用例改传固定基准 `2026-10-26T00:00:00.000Z`（reviewDueAt=2027-01-26），并补非法 ISO 日期抛错用例。

### 待办 ① orders DDL 列对齐（本地库已重放对齐）
- 补幂等 `ADD COLUMN`：`dosage / frequency / route / ordered_by / cancelled_by / cancelled_at / cancel_reason / reviewed_by`（text 可空，不强外键，兼容用户 ID 与 `system` 占位）。
- `order_no` 放宽为可空以对齐 `Order.orderNo` 可空契约（UNIQUE 保留，多 NULL 允许）；`20-clinical.sql` 建表定义同步可空，保证新环境首启口径一致。
- 核对 orders 全列与仓储 `mapOrder` 读/写路径已全部对齐。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 后端 `tsc --noEmit` | **退出码 0**，无类型错误 |
| 后端 `bun test tests/unit` 全量 | 16653 pass / 169 fail / 113 errors，16822 tests / 2245 files，150.39s，**退出码 1** |
| 后端 unit 隔离复跑（getDrugInfo / searchMedicalKnowledge / clinicalReportInterpretation） | 18 pass / 0 fail，**退出码 0** |
| integration `DEMO_MODE=1`（默认预加载） | 784 pass / 223 skip / 465 fail / 10 errors，1472 tests / 170 files，212.85s，**退出码 1** |
| integration `DEMO_MODE=0 / TEST_REAL=1`（真实 PG 口径） | 1330 pass / 191 fail / 2 errors，1521 tests / 170 files，246.80s，**退出码 1** |
| 前端 `vitest run --maxWorkers=2 --minWorkers=1` 全量 | Test Files **171 passed (171)**；Tests **1397 passed (1397)**，Duration 2419.26s，**退出码 0** |

## 本地 PG schema 补全过程与结论
- 重放前本地库 144 表；按编号数值序重放 `deploy/postgres/init/*.sql`（ON_ERROR_STOP=0）后 **469 表**。上轮 60 张缺表全部补齐；`imaging_reports.status`、`lab_interpretations.audience`、`satisfaction_surveys.nursing_score/logistics_score/department` 均已就位。
- 重放错误分三类：①预期 `already exists`（核心表/索引/trigger 非幂等重放）；②种子临时表 `tmp_*` 会话作用域失败（不影响业务 schema）；③真实 DDL 缺陷（`double` 类型应为 `double precision/float8`、个别 `#`/`||` 语法、前置 enum/类型缺失），集中在编号 90/273/291/292/294/296/297/299/338/349/350/355/369 等文件，列入下轮专项修复。

## integration 剩余 fail 归类（真实模式基线，退出码 1，未编造通过结论）
### A. DEMO_MODE 环境问题（主体，真实模式下消除）
- `22P02 invalid input syntax for type uuid`：DEMO_MODE=1 时 `userRepo` 直接返回内存演示用户 `id='demo-admin'`，该文本句柄被写入 uuid 外键列。默认口径下 325 处；`DEMO_MODE=0 / TEST_REAL=1` 后降至 **9 处**。
- 真实模式 pass 784→1330（+546）、fail 465→191、errors 10→2，证明主体为环境模式问题而非代码回归。

### B. 已在本轮修复的 schema 漂移
- `23502 null value in column "order_no"`（32 处）：仓储建单不生成单号、DDL 却 NOT NULL；已放宽 `order_no` 可空。inpatient-care 单文件复跑 order_no 报错清零。
- `42703 column "reviewed_by" of relation "orders"`：仓储 `reviewOrder` 写 `reviewed_by`，DDL 仅有 `reviewer_id`（列名漂移）；已补 `reviewed_by`。inpatient-care 单文件复跑 reviewed_by 报错清零。

### C. 遗留真实缺陷 / 待下轮逐文件归类
- `42703 column "patient_id" of relation "clinical_improvement_tasks"`（2 处）：afterAll 清理 SQL 按 `patient_id` 删除工单，但工单表仅 `visit_id`、无 `patient_id` 列；业务 `createTask` 也未传患者 ID。属工单表患者回溯列缺口，需 DDL 补列 + 仓储写 patientId 对齐（或清理 SQL 改走 visit_id）。
- 残留 `22P02` 9 处：错误分支构造的非 uuid 句柄（`thread-err-missing-0001`、`u-err-m86`、空串）落到 uuid 列，缺前置 UUID 校验拦截。
- 真实模式剩余 191 fail 中，inpatient-care 单文件 9 条为业务状态机断言 / 409 CONFLICT（如 `order.status` 期望 `pending_review`），非 schema 缺列；其余跨文件待低峰逐文件隔离归类。

## unit 全量 fail/error 归类（退出码 1）
- **web 误纳 73 fail**（与上轮一致）：`bun test tests/unit` 位置参数子串匹配纳入 `web/tests/unit/...`，在 Bun 运行时缺 vi 命名空间 / jsdom 全局而报错；归属 request/storage/auth/format/download/useOnlineStatus。前端用例应在 `web/` 目录由 vitest 运行。
- **后端并行污染 flaky**：`getDrugInfo` 3、`searchMedicalKnowledge` 3，全量并行下失败，隔离复跑与 `clinicalReportInterpretation` 共 18/18 全绿，判为跨用例状态污染/并发时序，非源码缺陷。
- 上轮唯一稳定后端历史遗留 `knowledgeRegistry:387`（时间漂移）本轮已修，对应 fail 消除。
- errors 113 与上轮持平，主要为 web 误纳 unhandled。

## 待办 ③ Bun web 目录排除失效根因（已定位，受版本限制未根治）
- 根因：Bun 1.2.0 位置参数 filter 为纯子串包含匹配、**无前缀锚定**（前缀锚定自 1.2.10 引入，oven-sh/bun#5969）；`pathIgnorePatterns` 不会对 filter 已命中的路径二次过滤（实测直接指定 web 测试文件仍被执行）。
- 处置：bunfig `pathIgnorePatterns` 增加 `web/tests/**`、`**/web/tests/**` 多形态作为扫描期剪枝兜底；不影响后端 `tests/web/smoke.test.ts`。
- 根治路径：升级 Bun ≥1.2.10 后用 `./tests/unit` 前缀锚定，或后端测试命令显式限定后端目录。

## 前端 vitest 复跑（待办 ④，已收口）
- 本轮 `web/` 源码零改动。上轮全量 52 failed / 1345 passed（1397），断言失败 0、全为超时/元素竞态，隔离复跑 transfusion-page + emergencyComponents 44/44 绿，判本机过载并行 flaky。
- 本轮降并发 `--maxWorkers=2 --minWorkers=1` 复跑：**Test Files 171 passed (171)、Tests 1397 passed (1397)，退出码 0，Duration 2419.26s**。上轮 52 条超时/竞态 fail 全部转绿，确认为低资源并行 flaky，非前端代码回归。

## 双仓镜像核对（推送后 ls-remote 逐字比对）
- 本地 HEAD：`ba52316cb49b6a8e2898a79d17dfa3a9e3e89f2d`
- origin（GitCode JLMEDAIOS, https）：`ba52316cb49b6a8e2898a79d17dfa3a9e3e89f2d` ✅
- gitcode（GitCode JLMEDAIOS, ssh）：`ba52316cb49b6a8e2898a79d17dfa3a9e3e89f2d` ✅
- mirror（GitHub JLAIharnessos, ssh.github.com）：`ba52316cb49b6a8e2898a79d17dfa3a9e3e89f2d` ✅
- 领先/落后三远端均 `0 0`，与本地完全一致。origin https 推送 hooks PASSED；ssh 仅 post-quantum 密钥交换算法告警，不影响连通。
- `heagentos` remote 仅含 `main`，未承载 `consult-agent-m86`，不在本次同步范围。

## 工作区遗留（本轮未提交，归类留存）
- `docs/` 大量 modified：`core.autocrlf=true`、`.gitattributes` 声明 `eol=lf`，纯 CRLF→LF 换行漂移，无实质内容 diff，按既有范式不入库。
- `reports/patrol/` 历史切片不符合 mainline/p5 豁免命名，保持未跟踪。
- `.txt` 取证日志（unit/integration/vitest/DDL 重放）由 `.gitignore` 忽略，本地留存备查；临时核对 SQL 已清理；`schema-backup-20261124-1506.sql` 为本地库结构备份，不入库。

## 待办（后续轮次）
1. 工单表 `clinical_improvement_tasks` 补 `patient_id` 列并让 `createTask` 写患者 ID，或清理 SQL 改走 `visit_id`；消除 2 处 42703。
2. 9 处错误路径非 uuid 句柄落库：在仓储/聚合器入口补 UUID 前置校验，拦截非法句柄，避免穿透到 DB 抛 22P02。
3. 真实模式 integration 剩余 191 fail 低峰逐文件隔离归类：业务状态机断言 / 409 冲突 / 权限口径逐条定性。
4. 修复重放日志中真实 DDL 缺陷（`double` 类型、`#`/`||` 语法、前置 enum/类型缺失），涉及编号 90/273/291/292/294/296/297/299/338/349/350/355/369。
5. orders 单号 `order_no` 生成规则作为后续增强（当前契约可空，不强制必填）。
6. 评估升级 Bun ≥1.2.10，用 `./tests/unit` 前缀锚定根治 web 误纳。

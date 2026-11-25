# 巡检简报 2026-11-25 15:04 轮（定时唤醒 · 连接池进程级兜底落地 · 2 件漏关池补齐 · BFF 限流桶跨进程隔离四选项评估 · 串行回归取证）

## 概要
本轮在起点基线 `efd94c7f`（三远端 `consult-agent-m86` 逐字一致、ahead/behind 0/0）上，继续推进不依赖架构拍板的测试基础设施根治与低风险工程债，生产行为不变、不触碰待拍板表结构与上线契约：①只读评估主池单例的 pump/lease/释放机制与 afterEach 回收缺口，实证 preload 层可挂进程级 afterAll 兜底关池，并补齐上轮甄别遗漏的 2 件真打主池文件；②对打长驻 8080 的 e2e 限流桶跨进程隔离做只读评估，梳理四个可行选项与改动面/风险，触及生产装配的选项标注为决策点，本轮不新增生产端点、不放松生产限流阈值；③受影响批次独立进程与同进程串行复跑取证，前后端 tsc 取真实退出码，增量静态甄别。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端 TS 仓库根 `typescript 6.0.2`；前端 `web/` 独立 `typescript 5.6.3`。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移记账 **350**；`iam.roles` **11**；`agent.workflow_instances` 残留 **0**。
- 起点基线 HEAD：`efd94c7f749e2625236364d61571ea550db7bdf3`（origin / gitcode / mirror 的 `refs/heads/consult-agent-m86` 逐字一致、0/0）。
- 8080 demo 实例：`/health` **200**（DEMO_MODE=1，本轮未重启）。
- 本轮生产 `src/` 零改动；改动仅落在测试基础设施 `tests/support/testEnv.ts` 与 `tests/integration` 2 个文件。

## 专项① 连接池生命周期根治评估与兜底落地
### 现状评估（只读）
- 连接池模块 `src/db/pool.ts`：模块级单例 `_sql`，`getDb()` 懒建；`closeDbForTest()` 关物理池并重置关闭标志；`execTestCleanup`/`releaseTestVisit` 走独立短连接，绕开主池 afterEach pump 缺陷（M48-A）。
- **afterEach 级统一回收不可行**：M48-A 根因为 bun 1.2.0 Windows 上 afterEach 阶段主池连接读循环不 pump，池上查询永久挂起；closeDbForTest 重建主池还可能触发 postgres.js 堆崩溃。全仓 4 个含 afterEach 的文件（inpatient-care / inpatient-core / inpatient-routes / worm-s3-fallback）均已走独立短连接或无库，未在 afterEach 用主池，无新增主池 afterEach 风险面。
- **跨文件复用**：bun test 单进程顺序执行多文件，模块级 `_sql` 跨文件复用；逐文件 afterAll 关池是约定而非强制，漏关文件的连接留池，进程退出时可能形成句柄泄漏或悬挂。
- **钩子时机实证**：用最小探针在 preload 模块注册 `afterAll`，两个测试文件同进程跑，命中文件数 **HITS=1**——确认 bun 1.2.0 中 preload 注册的 afterAll 在整轮测试结束后全局执行一次（非每文件一次），可作为进程末尾兜底安全网。探针跑完即清理，bunfig.toml 已还原无 diff。

### 落地清单（3 文件）
1. `tests/support/testEnv.ts`：preload 挂载进程级 `afterAll` 兜底 `await closeDbForTest()`。
   - 纯测试基础设施层，不动生产池上限（`PG_POOL_MAX ?? 10`）、idle 超时与重连策略。
   - `closeDbForTest()` 在 `_sql` 为 null 时直接返回：纯 mock/unit 进程从未 `getDb()`，不建池、无副作用；真实模式进程在所有文件收尾后优雅关闭主池。兜底只挂进程末尾 afterAll，不介入用例之间。
2. `tests/integration/internetPrescription.test.ts`：import 补 `closeDbForTest`，afterAll 主池清理完成后 `await closeDbForTest()`。
3. `tests/integration/patientDelegation.test.ts`：import 补 `closeDbForTest`，afterAll 级联删除后 `await closeDbForTest()`。
- 170 个 integration 文件最新分类：**130** 个进程内文件 afterAll 已关池；**32** 个 fetch 长驻 8080 BFF（不占测试进程主池）；**8** 个纯内存/不打主池（scenario1–5、consultFlow、consultRouteErrors、worm-s3-fallback）。上轮遗漏的 2 件真打主池文件本轮已补齐。

### 回归取证（真实模式 `TEST_REAL=1` + `DEMO_MODE=0`，真实退出码）
| 批次 | 结果 | 退出码 |
|---|---|---:|
| unit 样例 `academicLevelV13.test.ts`（验证兜底在无池进程无副作用） | 5 pass / 0 fail / 6 expect | **0** |
| `internetPrescription.test.ts` 独立进程 | 14 pass / 0 fail / 36 expect | **0** |
| `patientDelegation.test.ts` 独立进程 | 15 pass / 0 fail / 19 expect | **0** |
| 16 件同 bun 进程串行（上轮 14 件 + 本轮 2 件） | **232 pass / 0 fail / 625 expect** | **0** |

- 串行批次 27.43s 完成，多文件串联无 hang、无堆崩溃；进程末尾全局兜底关池后进程正常退出。

## 专项② BFF e2e 限流桶跨进程隔离评估（只读，本轮不落地生产装配）
### 桶分层现状（源码取证）
- **中间件桶**（`src/bff/middleware/rateLimit.ts`：`buckets` / `loginBuckets`）：`rateLimit` 与 `loginRateLimit` 在 `DEMO_MODE=1/true` 直接 `return null` 不计数；8080 demo 实例 DEMO_MODE=1，这两桶对 e2e 不累积。既有 `__resetRateLimitBuckets()` 测试钩子仅供进程内使用。
- **聚合器桶**（`src/bff/aggregators/loginLockoutAggregator.ts`：`accounts` / `ipLogin` / `readBuckets` / `writeBuckets`，`__resetStore()`）：
  - `readBuckets`/`writeBuckets`：仅被 `globalRateLimit` 中间件取用；本机回环 + devMode + 无 XFF 时中间件免流短路，不取 token，不累积。
  - `accounts`（账号失败 5 次锁 15min，key=username）与 `ipLogin`（同 IP 登录 20/min 封 5min，key=IP）：在 `auth.ts` login handler 内**无条件**检查/记录，不经 DEMO_MODE 短路；成功登录清零账号计数，IP 封 5min 内不自动解。
- 跨进程：32 个打长驻 8080 的 e2e，桶在 BFF 进程内存；测试进程内的 `__resetStore()` / `__resetRateLimitBuckets()` 跨进程够不到。`clientIp` 默认为 null，登录 IP 回退 `127.0.0.1`，故 `ipLogin` 桶 key 即本机回环，所有 e2e 共享。
- 现状污染点：`loginLockout-e2e.test.ts` 自身制造 25 次 IP 风暴触发 429 后，本机 IP 封禁残留 5min，用例 afterAll 未解封；账号桶已用随机 username（`lockme-${SALT}` / `ipstorm-${SALT}`）命名空间隔离，不污染固定演示账号。

### 四个可行选项（改动面 / 风险 / 决策点）
- **选项 A · 测试侧调现有 admin 接口解封（零生产装配改动，低风险）**：在制造 IP 风暴/失败登录的 e2e afterAll，用自签 admin JWT 调既有 `POST /api/v1/rate-limit/unlock`，解 IP（`127.0.0.1`）与残留账号。复用现有路由与 admin 鉴权，不新增端点、不改生产阈值。局限：需自签 admin JWT（loginLockout-e2e 已有 `sign` 样板）；read/write 桶本就不累积，无需清。**列入待落地测试层改进，本轮未改 e2e。**
- **选项 B · BFF 新增仅非生产注册的全量桶重置端点（触及生产装配，决策点）**：新增 `POST /api/v1/_test/reset-ratelimit`，`isProductionEnv()` 时不注册/404/403，非生产可调 `__resetStore()` + `__resetRateLimitBuckets()`。改动面为路由新增 + server 挂载环境分支。**属生产装配决策点**：需评审生产不可达保证、鉴权口径与路由表暴露面；本轮不落地。
- **选项 C · 调度串行 + 账号/IP 命名空间隔离（纯测试调度层）**：账号桶用随机 username（现状已做）；IP 桶无法按账号分，只能靠串行调度、用例间间隔超 1min 窗口自然过期，或控制登录频次 <20/min。零生产代码改动，但 IP 风暴用例后 5min 内其他登录 e2e 仍可能受影响。
- **选项 D · 每轮 e2e 前重启 8080 demo 实例（现成零代码兜底）**：进程重启清空全部内存桶；成本为重启 BFF（旧实例非 watch，新代码本就需重启加载）。作为当前最低成本兜底手段沿用。

- 红线复核：本轮未放松生产 5/min/IP、20/min/IP、账号 5 次锁定等任何限流阈值与窗口策略；未向生产暴露清场端点。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 | 退出码 |
|---|---|---:|
| 后端 `tsc --noEmit`（仓库根，TS 6.0.2） | 零类型错误 | **0** |
| 前端 `bun run --cwd web typecheck`（web TS 5.6.3） | 零类型错误 | **0** |
| unit 样例兜底无副作用验证 | 5 pass / 0 fail | **0** |
| 2 件补钩子文件独立进程真实模式 | 14 + 15 pass / 0 fail | **0** |
| 16 件同进程串行批次 | 232 pass / 0 fail / 625 expect | **0** |

## 增量静态甄别
- 本轮 3 文件增量 **23** 行（testEnv 兜底 19 行 + 2 件各 2 行：import 改一行、afterAll 加一行）：代码侧 `any`=**0**、裸 `console`=**0**；未新增导出（`closeDbForTest` 为 `pool.ts` 既有测试专用导出）。
- 存量维持列待办、不批量重构：`any` **38** 处、裸 `console.log` **43** 处、约 **1.86 万** 导出符号。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **限流桶跨进程隔离**：选项 A（测试侧 afterAll 调现有 admin unlock 解本机 IP/残留账号）待择机落地；选项 B（非生产全量重置端点）列生产装配决策点待评审；选项 C/D 作调度与重启兜底。
- **审计链残留**：`audit.events` seq 1647 断点仍待方案 1（本地测试库清表重建）/ 方案 2（按 seq 整条重算）获授权后复测 5 条转绿；方案 3 生产根因修复留专项评审。本轮未清表、未重算、未改表结构、未改链算法、未回填。
- **连接池待办**：M48-A afterEach pump 根因根治（bun 升级后复核）；其余长驻演示内存聚合器跨轮残留持续观察。
- **medical-qc 后端详情视图组装**：四项待裁决后落地；本轮未扩接口形状。
- **role_permissions 全量镜像待拍板**：三前置条件未具备；未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。HTTP 429 生产触顶实测受迁移链阻断，门控以现有单测为准，未伪造触顶结果。
- **工具链待办**：web 独立 TS 5.6.3 与根 TS 6.0.2 版本对齐需专项评估 antd5/React19/vitest 兼容回归后再决策；本轮以入口隔离跑通门禁，未升级版本。
- **代码质量待办**：存量 `any` 收窄；生产裸 `console.log` 迁结构化日志；未使用导出/死代码跨文件扫描；server.ts 剩余不可考注释乱码。
- **文档待裁决**：出参嵌套子字段披露粒度、06/24/29 职责漂移、30 动态只读、角色列契约、空权限语义、预留错误码。
- 本轮临时探针/扫描件/备份/历史 patrol 切片（`_rep10_*`、`_rep9_*`、`_rep8_*`、`_probe*.sql/.ts`、`_seed_*.sql`、`_sweep*.ps1`、`schema-backup-*.sql`、`_scan_*.md`、20261103–20261117 切片与 round1-3）不入库；docs CRLF→LF 历史漂移不纳入提交。

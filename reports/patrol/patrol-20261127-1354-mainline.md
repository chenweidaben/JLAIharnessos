# 巡检简报 2026-11-27 13:54 轮（定时唤醒 · 存量 any 按域收窄 25 处 · console/死代码清单 · 隔离与工具链只读评估 · 三镜像核对 0/0）

## 概要
本轮在干净基线 `a28db2bd`（origin / gitcode / mirror 逐字一致、0/0、tracked 0）上，续接台账可自主工程债：优先把 src 点名清单内的存量类型 `any` 按域收窄为 `unknown` / `postgres.JSONValue` / `postgres.Parameter` / 明确接口与聚合器入参泛型，未用 `any` 反向兜底、未放松 strict；随后产出裸 `console` 分类清单与未使用导出粗扫清单（本轮不批量强改、不删除），并完成测试隔离延伸与工具链升级的只读方案评估。后端 `tsc --noEmit` 与前端 web typecheck 双 0；受影响核心 12 文件 **164 pass / 0 fail**；全量 unit 复跑 **16677 pass / 163 fail / 113 errors**，与上轮基线逐项持平，无新增回归。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端根 TypeScript `6.0.2`；前端 `web/` 独立 TypeScript `5.6.3`。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码），本轮未写库。
- 起点 HEAD：`a28db2bdc133f3b1eb334ffa58d5658ca1a4cbf1`；三远端起点一致，0 领先 / 0 落后。

## 专项① 存量 any 按域收窄（25 处 / 15 文件，后端 tsc exit 0）
收窄原则：外部入参 `unknown` + 类型守卫 / 明确接口；DB JSON 边界用 `postgres.JSONValue`；绑定参数用 `postgres.Parameter`；HTTP body 用聚合器入参泛型 `Parameters<typeof fn>[0]` 或明确字面量形状；跨层断言一律 `unknown` 中转，不出现新的 `any`。

| 文件 | 处置 |
|---|---|
| `db/repositories/helpers.ts` | `toJson<T>` 返回 `any` → `postgres.JSONValue`；`unsafe` 参数 `as any[]` 去除，直传 `unknown[]` |
| `db/repositories/auditChainRepo.ts` | `insertChained` / `insertWithChainLock` 的 `detail: string`（名不副实）→ `postgres.JSONValue` |
| `db/repositories/consultAgentRepo.ts` | `toJsonParam` 返回 `any` → `postgres.Parameter`，移除 any/unsafe-argument 抑制 |
| `db/repositories/knowledgeRepo.ts` | `parseJsonb` 泛型化 `<T>`，调用点显式标注 `number[]` / `Record<string, unknown>`；两处写入侧 `as any` 去除 |
| `bff/mfaRuntime.ts` | `unsafe` 结果 `as any as T[]` → `as unknown as T[]` |
| `bff/routes/adminHealth.ts` | `getDb() as any` 去除，模板 tag 原生可用 |
| `bff/aggregators/systemHealthAggregator.ts` | `getDb() as any` 去除；池内部属性访问改 `unknown` 中转 `Record<string, unknown>` |
| `bff/routes/alerts.ts` | `(fs as any).statfsSync` 改局部 `StatfsResult` 接口 + `unknown` 中转（Node 实验 API 类型缺失） |
| `bff/routes/improvementTask.ts` | body `{ to: any }` → `{ to: TaskStatus; resolutionNote?: string }`，合并两次 body 读取为一次 |
| `bff/routes/nissReporting.ts` | body `as any` → `c.body<{ status: string }>()` |
| `bff/routes/nqi.ts` | 4 处 `...b as any` → `Parameters<typeof reportFall/reportPressureUlcer/reportTubeDisplacement/reportRestraint>[0]` |
| `bff/aggregators/surgeryScheduleAggregator.ts` | demo 行 `} as any` 去除，字段与 `ScheduleItem` 对齐 |
| `bff/routes/outpatient.ts` | DEMO bundle 定义 `DemoDiagnosis / DemoOrder / DemoPrescription / DemoBundle` 接口，4 处回调 `(x: any)` 去除标注由推断收窄 |
| `bff/routes/selfScheduling.ts` | 手写 any 形状 → `Parameters<typeof seedSlots>[0]` |
| `bff/routes/vteAnticoag.ts` | body `as any` → `{ score: number }` / `{ endDate: string }` |

- **保留不动**：`db/pool.ts` 4 处 `postgres.Sql<any> / TransactionSql<any> / ISql<any> / Options<any>`，为 postgres.js 泛型类型边界，带 eslint-disable，按台账保留。
- **补充台账（本轮未改，下一轮评估）**：首轮正则未覆盖的 `Record<string, any>` 共 7 处——`integration/protocols/fhir/FHIRResource.ts`(3)、`FHIRBuilder.ts`(2)、`bff/routes/empiFederated.ts`(1)、`xds.ts`(1)。FHIR 为动态资源路径遍历边界，路由两处 body 字段需补类型守卫后再收 `unknown`，避免未校验 body 强转引入运行时差异。
- `codeQualityAggregator.ts` 内 any 命中均为扫描规则描述字符串文案，非类型 any，未改动。

## 专项② 裸 console 甄别清单（只读，未批量强改）
- 扫描范围 `src/**/*.ts` 单行 `console.*`：**179 处 / 116 文件**（与上轮粗扫 222 的口径差：上轮含跨行 / `.tsx` / web 子树，本轮以 src `.ts` 单行实测为准）。
- 方法分布：`error` 99、`warn` 45、`log` 22、`info` 12、`debug` 1。
- 分类分布（按路径域 + 方法初分，明细见临时扫描产物，未入库）：
  - **错误告警 104**：catch 降级 / 留痕失败 / 外部调用异常，迁 `logger.error / warn` 并补 traceId / 模块上下文字段；
  - **审计/安全 30**：审计链、鉴权、WORM 密钥运维留痕，迁结构化审计日志通道，不直接删；
  - **启动装配 28**：server 启动、配置加载、缓存工厂、调度器，迁启动期 `logger.info`；
  - **其他观测 14**：聚合器 / 路由业务分支 `log/info`，逐处甄别后或迁 `debug` 或清理；
  - **迁移 2**：`db/migrate.ts` 迁移进度输出，保留或迁迁移专用日志；
  - **调试 1**：`console.debug`，优先清理。
- 迁移目标：`src/core/logging/Logger.ts`（`rootLogger`，debug/info/warn/error/critical 五级结构化，支持子 Logger 上下文）。本轮不批量强改；调试类与业务分支 `log/info` 列为优先清理对象。

## 专项③ 死代码 / 未使用导出粗扫清单（只读，未删除）
- 口径：词法标识符计数，覆盖 `src + tests`，自身文件扣除；导出符号 **21153**，零外部引用候选 **4343**，仅 1 处外部引用 **678**。
- 抽查复核：候选中相当部分为"导出但仅本文件使用"的 `interface/type/const`（如 `desensitize.ts:maskMrn`、`agentAdmission.ts:AgentOutputType` 等），可后续去 `export` 收窄；但词法扫描存在已知噪声——barrel re-export 转发、动态属性 / 字符串键引用、前端 `web/` 目录引用、同名标识符碰撞均未计入。
- **处置原则**：零引用不代表可直接删除，需复核模块级初始化、路由注册、全局单例、反射注册等副作用；本轮不删除任何符号。建议下一轮接 AST（tsc `noUnusedLocals` / eslint 未使用规则）复核后，无害项在门禁保护下分批移除，风险项保留待复核。

## 专项④ 测试隔离延伸评估（只读方案，未改测试钩子）
- **DEMO_MODE**：已由 `tests/support/testEnv.ts` 全局 `beforeEach` 兜底复位，维持现状。
- **NODE_ENV / TRUST_PROXY / DATABASE_URL**：均为断言生产 / 非生产分支的用例改写，文件内 `afterEach/afterAll` 自带还原（`prodDemoFailClosed`、`globalRateLimit`、`demoModeGuard`）。**暂不纳入 preload 全局兜底**：这些不是普通演示用例的模式开关，污染窗口限定同文件；全局复位需记录原始值且 `TEST_REAL=1` 下不干预，误复位会破坏生产分支断言。下一轮逐文件核查还原钩子覆盖度与并发时序。
- **WORM_***（`WORM_STORE_DIR / WORM_BACKEND / WORM_KEY_DIR / WORM_KEK / WORM_FILE_KEY / WORM_SM4_*`）：指向临时目录 / 测试密钥，文件内还原。属密钥与路径隔离，preload 兜底不得误清真实 KEK，保留文件内还原。
- **wormKeyProvider `afterAll` → `afterEach`**：评估**可行**。`beforeEach` 已每用例重置基线 env（`WORM_KEK` / 清 `NODE_ENV` / `DEMO_MODE` / `WORM_FILE_KEY`）；`afterEach` 补 `ORIGINAL_ENV` 还原 + `tmpDir` 清理 + `__resetKeyProvider(null)`，可把密钥 / provider 污染窗口从文件级缩到用例级。建议下一轮随隔离回归落地，本轮不改测试钩子。

## 专项⑤ 工具链评估（只读方案，未擅自升级）
- **Bun ≥1.2.10 前缀锚定**：当前 1.2.0 位置参数 filter 为纯子串包含、无前缀锚定（oven-sh/bun#5969），致 web 测试被误纳（163 fail / 113 errors 主体）。≥1.2.10 支持前缀锚定后，可把 `bun test tests/unit` 改为锚定并简化 `pathIgnorePatterns`。前置：全量 unit / integration 回归；复核 M48-A（Windows afterEach 主池读循环不 pump）根因在新版是否缓解；锁定版本与锁文件。
- **web → TS6 对齐**：后端 TS 6.0.2，web 5.6.3。对齐前需评估兼容回归面：antd 5.22 类型声明、`@types/react` 19、vitest 2.1.8 内嵌 TS 版本、typescript-eslint 8.15 对 TS6 支持矩阵；web 跨引用 `@/bff/*`、`@/knowledge/*` 后端类型需一致。建议独立分支先升 `typescript ~6.0`，跑 web typecheck + vitest 全量 + `vite build` 取证，报错按 antd / react / vitest 分类处置，不阻塞后端。

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit`（TS 6.0.2） | 0 error | 0 error | **0** |
| 前端 `bun run --cwd web typecheck`（TS 5.6.3） | 0 error | 0 error | **0** |
| 受影响核心 12 文件 unit | — | **164 pass / 0 fail** | **0** |
| unit 全量 pass | 16677 | **16677** | — |
| unit 全量 fail | 163 | **163**（既有 bun 1.2.0 web 误纳，持平） | **1** |
| unit 全量 errors | 113 | **113**（web 加载误纳，持平） | — |
| 测试规模 | 16840 tests / 2247 files | 16840 tests / 2247 files | — |

- 受影响核心覆盖：nqi / selfScheduling / improvementTask / surgerySchedule / systemHealth / consultAgentRepo / mfa / pg-mfa-store / auditChainVerify / KnowledgeBaseManager / vteRisk / evalSummaryVteNiss。
- 全量 fail 尾部仍为 web DOM 缺失（localStorage / document / Blob / navigator）与超时挂起，与基线同源，无新增 fail 文件。

## 红线复核（拍板 / 裁决前未擅动）
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审；审计链 seq 1647 断点复测（需测试库授权与备份）。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **补充 any 台账**：7 处 `Record<string, any>`（FHIR 5 + 路由 2）下一轮结合类型守卫收窄。
- **console 迁移**：179 处按清单分批迁结构化日志；调试 / 业务分支 `log/info` 优先清理；审计 / 启动 / 迁移类保留可观测性。
- **死代码复核**：4343 零引用候选需 AST 复核后再分批移除，本轮未删。
- **测试隔离**：wormKeyProvider afterAll→afterEach 待落地；其余进程级 env 残留维持文件内还原；M48-A afterEach pump 根因随 bun 升级复核；长驻演示内存聚合器跨轮残留持续观察。
- **Python 测试待复跑**：本机缺 pytest / fastapi / httpx 且无项目 venv，`test_api_key_middleware.py` 仅 `py_compile` 通过，pytest 结果待具备依赖环境复跑，未伪造通过。
- **未入库产物**：本轮临时扫描 / 留痕脚本（`_rep15_*`）、历史 patrol 切片、schema 备份、lint 扫描 JSON、`docs/TODO_LEDGER.md`、`scripts/_*.py` 不入库。

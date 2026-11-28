# Bun 运行时升级前置只读调研报告（健康画像平台后端仓）

- **调研日期**：2026-11-28
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- **调研性质**：**只读前置评估**。本轮未执行 Bun 升级、未改 `package.json` / `bun.lock` / `bunfig.toml`、未改生产源码；联网仅核对官方 changelog / release notes / issue 线索。本文不构成"已验证可升级"结论。
- **产品名称**：健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）；主体：健澜科技（杭州健澜科技有限公司）。

---

## 1. 当前版本与声明差异表

### 1.1 实测与声明对照

| 项 | 实测 / 声明值 | 来源 | 备注 |
|---|---|---|---|
| 本机 bun 二进制 | **1.2.0**（`C:\Users\lenovo\.bun\bin\bun.exe --version` 实测） | 本轮本地复核 | 不在 PATH，脚本经 fallback 路径解析 |
| `engines.bun` | `>=1.3.0` | `package.json` 第 35 行 | **运行时低于声明下限** |
| `packageManager` | `bun@1.4.2` | `package.json` 第 38 行 | 与本机运行时不一致 |
| devDep `bun-types` | `1.3.11` | `package.json` 第 95 行 | 与运行时、packageManager 均未对齐 |
| CI `BUN_VERSION` | `1.4.2` | `.github/workflows/ci.yml` 第 23 行；`release.yml` 第 33 行 | **CI 已跑 1.4.2，本机跑 1.2.0，存在本地/CI 分叉** |
| Node 运行时 | v22.23.2 | 台账实测口径 | 后端 TS 6.0.2；web 独立 TS 5.6.3 / vitest |
| 锁文件 | `bun.lock`，`lockfileVersion: 2`（文本锁），git 跟踪 | 本轮本地复核 | `release.yml` 安装用 `--frozen-lockfile` |
| 后端测试现状口径 | unit **16677 pass / 163 fail / 113 errors**（16840 tests / 2247 files） | `reports/patrol/patrol-20261127-1228-mainline.md` | 113 errors 为 bun 1.2.0 子串误纳 `web/tests` 的既有环境性失败；web 由独立 vitest 工具链运行，不经 Bun 测试器 |

### 1.2 差异定性

- 本机运行时 **1.2.0** 同时低于：`engines.bun` 下限（1.3.0）、`packageManager` 声明（1.4.2）、CI 实际版本（1.4.2）。
- 类型包 `bun-types 1.3.11` 介于运行时与 packageManager 之间，三者当前互不对齐。
- 该分叉意味着：本地复现的缺陷（M48-A、env 串扰、filter 误纳）结论只在 1.2.0 上成立；CI 的 1.4.2 行为未在本机逐件复核过。

---

## 2. Bun 1.2.10 → 1.3.x → 1.4.x 与本项目相关的变更要点

> 来源以官方 Bun Blog release notes 为准；commit 级细节辅以可访问的 changelog 镜像。GitHub issue 页面对自动访问受限（robots.txt），issue 编号沿用本地台账口径并在文中标注待实测项。

### 2.1 1.2.10（2025-04-17，修复 33 个缺陷）

- **`setImmediate` 性能/事件循环修复**：修复了存在非定时器 pending I/O 时 `setImmediate` 极端变慢的缺陷（1.2.9 约 74,000ms → 1.2.10 约 4ms）。与"事件循环是否及时排空回调/pump I/O 事件"这一主题相邻。
- **测试器**：`spawnSync` 用例超时现在能正确终止子进程；`test.failing` 配合 done 回调的判定修复。
- **Docker 基础镜像**：默认镜像由 Debian Bullseye 升 Bookworm。
- **测试路径过滤（本地台账口径，待实测复核）**：`bunfig.toml` 注释记录"Bun 1.2.0 位置参数 filter 为纯子串包含匹配、无前缀锚定；前缀锚定自 1.2.10 起（oven-sh/bun#5969）"。**官方 v1.2.10 release notes 摘要未单列该过滤行为修复**；是否确在 1.2.10 落地，需在独立分支用 `bun test ./tests/unit` 前缀参数实测确认，不可仅凭台账口径下定论。
- 来源：<https://bun.sh/blog/bun-v1.2.10>

### 2.2 1.2.11 – 1.2.15（相邻补丁线）

- **1.2.11**（修复 62 个缺陷）：新增 `process.ref()` / `process.unref()`；修复 Bun 原生 PostgreSQL 客户端 `flush()` 方法为 undefined 的问题（注：这是 Bun 自带 SQL 客户端，与本仓使用的第三方 postgres.js 驱动无关）；`queueMicrotask` 错误处理、node:crypto/https/tls 多项兼容修复。来源：<https://bun.sh/blog/bun-v1.2.11>
- **1.2.15**（2025-05-28）：**内置 `bun audit` 子命令**落地——基于与 `npm audit` 相同的 API 端点扫描 `bun.lock` 依赖漏洞；同期新增 `bun pm view`、`BUN_OPTIONS` 环境变量。
  - 含义：本机 1.2.0 **没有**内置 audit；本仓 `security:audit` 脚本为 `bun audit || npm audit --omit=dev`，在 1.2.0 上实际落到 npm 兜底。升级到 ≥1.2.15 后 audit 走 Bun 原生路径，输出口径与退出码需重新记录。
  - `bun audit fix`（自动修复）则是 **1.4.0** 才加入（见 2.5）。
  - 来源：<https://bun.sh/blog/bun-v1.2.15#bun-audit>

### 2.3 1.3.0（测试器与运行时可靠性大修）

**测试器执行模型**

- 测试执行逻辑重写，describe 块与钩子（`beforeAll` / `afterAll` 等）的执行顺序可靠性、可预测性对齐 Vitest 行为。
- 钩子时序修复（与本仓测试隔离直接相关）：
  - async `beforeEach` 失败会阻断对应用例执行；async `beforeEach` 错误正确上报，不再以"unhandled error between tests"形式出现；
  - `beforeAll` / `afterAll` 钩子支持 timeout 选项，超时判失败；`afterAll` 在 `beforeAll` 失败时仍会执行（对齐 Jest）；
  - preload 脚本中 `beforeAll` 错误现在会正确跨所有文件中止测试；
  - **异步用例中的未捕获 promise rejection 不再导致测试器挂起（hang）**；
  - `test()` / `afterAll()` 嵌套在另一个 `test()` 回调内现在抛错而非被静默忽略。
- **测试过滤**：修复"目录名作为参数传入时测试过滤不正确"；`-t <filter>` 无匹配用例时由"静默成功"改为报错（既有脚本若依赖静默成功需调整）；`-t` 过滤不再把 skipped/todo 用例带入输出。
- **Windows 专项修复**：`bunx` "exec" 错误、`node:fs` 的 `stat()` 断言失败、`.npmrc` BOM 解析、`fs.accessSync()` / `fs.existsSync()` 相对路径 `../` 段处理、无效文件路径断言、Windows 文件监视器在大量文件同时变更（如切分支）时崩溃、大文件读取整数转换 panic、`Bun.which` 非 ASCII 路径查找、`install.ps1` PATH 拼接、shell 管道、压缩包临时文件名、`bun outdated` / `bun install` 竞态崩溃等。
- **运行时**：进程退出时 pending 查询不再 hang（该条目位于 Bun 原生 SQLite/SQL 语境，**不是** postgres.js 驱动语境）；`unref` 的 `setImmediate` 不再保活事件循环；worker_threads 稳定性多项修复。
- **Node 版本上报**：1.3.0 起 `process.version` / `process.versions.node` 上报为 Node v24.3.0（1.2.x 时点为 v22.6.0）。
- 来源：<https://bun.sh/blog/bun-v1.3.0>

**1.3.x 后续补丁择要**

- **1.3.1**：测试器新增 Vitest 风格全局 `vi`、`--pass-with-no-tests`、`--only-failures`。
- **1.3.2**：新增 `onTestFinished` 钩子（用例结束、所有 `afterEach` 跑完后触发，只能在测试体内调用）；隔离安装的 hoisting 恢复为默认行为。
- **1.3.3**：`bun:test` 支持 `retry` / `repeats`；`--no-env-file` 允许禁用自动加载 env 文件。
- **1.3.4**：测试器 fake timers；`URLPattern`；修复 `http.Agent` 连接池不复用的关键缺陷。
- **1.3.13**（2026-04-20，见 2.4）；**1.3.14**：`Bun.Image`、实验性 HTTP/2 与 HTTP/3 fetch 客户端、Linux/macOS `fs.watch()` 重写、Windows 经 ConPTY 的 `Bun.Terminal`。

### 2.4 1.3.13：`--isolate` / `--parallel` / `--shard` / `--changed`

- **`--isolate`**：每个测试文件在**同一进程内**运行于全新的 JavaScript global 对象。文件之间：排空 microtask、关闭所有 socket、取消定时器、杀掉子进程、创建干净 global；`--preload` 脚本在新 global 中重新执行。目标是消除"单跑通过、全量失败"的跨文件状态污染。
- **`--parallel[=N]`**：测试文件分发到 N 个 worker 进程（默认 CPU 数），空闲 worker 偷取最忙队列；worker 自动带 `--isolate`；覆盖率与 JUnit 输出跨 worker 合并；`--bail` 任一 worker 首败即停。
- **`--shard=M/N`**：按文件路径确定性 round-robin 拆分到 CI 多机；空 shard 退出 0；可与 `--changed` / `--randomize` 组合。
- **`--changed`**：基于 git 改动与测试文件导入图，只跑受影响用例。
- 来源：<https://bun.sh/blog/bun-v1.3.13>

### 2.5 1.4.0（2026-08，含 1.3.0 以来累计修复 2,900+ 缺陷）

**测试隔离稳定性修复（`--isolate` 首批问题收口）**

- 文件内安装的 fake timer 不再泄漏到下一文件；模块作用域启动的子进程在文件结束时被杀掉，不拖到整轮结束；`process.chdir()` 不再改变下一文件工作目录；泄漏的 server/socket 句柄不再钉住该 global 对象；带 top-level `await` 的 preload 脚本在首个用例前完成；N-API 原生插件跨文件可用；修复两文件 global 切换期间 GC 崩溃；调试器在 isolate 下断点可解析。
- `bun test --parallel` / `--shard` / `--timings`（按单文件耗时均衡分片）/ `--changed` 正式可用；`JEST_WORKER_ID` / `BUN_TEST_WORKER_ID` 环境变量就位。

**包管理与审计**

- 新增 `bun audit fix`（在既有范围内把漏洞依赖升到最低安全版本）；同期新增 `bun dedupe`、`bun prune`。

**Windows 与网络**

- Windows ARM64 原生构建；`setTimeout(fn, 1)` 在 Windows 上约 1.4ms 触发，不再舍入到 15.6ms 系统 tick；Bun 可在 Windows AppContainer 内运行。
- **Docker 启动窗口重试**：池连接在握手完成前被关闭（如容器化数据库仍在启动）时，Bun 按指数退避重试直到 `connectionTimeout`，不再让等待中的查询直接失败——对本地起库 / 集成测试启动阶段有正面意义。

**兼容性注意**

- 运行时上报 **Node 26**；`process.versions.modules` 为 147，按 `NODE_MODULE_VERSION` 挑选预编译原生插件的包需复核；`res.writeHeader()` 移除（用 `res.writeHead()`）；paused 模式 `readable.read()` 无 size 参数时返回单块而非整缓冲。
- 运行时由 Zig 重写为 Rust；空闲 CPU 降低约 5×、内存降低最高 35%、Linux 启动快约 50%。
- 来源：<https://bun.sh/blog/bun-v1.4>

**1.4.x 补丁线**：1.4.2 为 CI/release 已固定版本；1.4.3 内置 `bun check` 类型检查器、`--check` 透传到 `bun run`/`bun build`/`bun test`；1.4.4 内置 `bun fmt`（Prettier 兼容格式化器）、安装器 Yarn Berry 锁文件迁移等。截至调研日 npm 上 `bun-types` 最新为 1.4.5。

### 2.6 bun-types 配套口径

- `bun-types` 与 Bun 运行时**锁步发布**；`@types/bun` 只是加载 `bun-types` 的 shim。类型包版本应与运行时大版本配套，错配可能出现 `bun:test` / `Bun.*` API 类型缺失或签名错位。
- 本仓直接依赖 `bun-types 1.3.11`；若运行时升到 1.4.x，类型包需同步到 1.4.x 线，不能停留在 1.3.11。
- 来源：<https://www.npmjs.com/package/bun-types>

---

## 3. M48-A 根因复核与后续版本修复线索核查

### 3.1 本地已固化根因（台账与源码互证）

- **现象**：bun 1.2.0 Windows 上，`afterEach` 阶段主池连接读循环不 pump；服务端已执行完查询、在 ClientRead 等客户端，但 socket data 事件不触发，导致 `afterEach` 里任何走主池的查询（哪怕 `SELECT 1`）永久挂起。`closeDbForTest()` 重建主池还可能触发 postgres.js 堆崩溃。
- **本仓缓解措施**（`src/db/pool.ts`）：
  - `execTestCleanup` / `releaseTestVisit` 改开**独立短连接**执行清理，不碰主池，带超时兜底；
  - afterEach 级统一回收不可行；测试兜底只挂进程末尾 `afterAll`（`tests/support/testEnv.ts`），不介入用例之间；
  - 全仓仅住院类 4 个含 `afterEach` 的集成文件走独立短连接或无库，未在 afterEach 用主池。
- **台账证据**：`reports/patrol/patrol-20261125-1504-mainline.md` 专项①；源码注释见 `src/db/pool.ts` 第 128–190 行、`tests/support/testEnv.ts` 第 46–60 行。

### 3.2 后续版本可核实线索

- **1.3.0** 重写了测试执行顺序与钩子可靠性，修复了"异步用例未捕获 rejection 导致 runner hang"及一批钩子时序问题；但官方 release notes 与可访问 changelog 镜像中，**未定位到明确点名"Windows afterEach 阶段 postgres.js 池连接读循环不 pump / socket data 不触发"的修复条目**。
- **1.3.13 / 1.4.0** 的 `--isolate` 在文件间关闭 socket、取消定时器、清理子进程，并修复一批隔离稳定性问题；这改变了跨文件资源回收模型，但**不等同于**修复"afterEach 钩子内主池查询不 pump"这一特定缺陷。
- **1.4.0** Windows 定时器精度提升、Docker 启动连接退避重试属相邻改善；1.2.11 的 PostgreSQL `flush()` 修复针对 Bun 原生 SQL 客户端，与 postgres.js 无关。

### 3.3 核查结论

> **M48-A 在后续哪个版本被明确修复：未定位到明确修复版本。** 现有证据只能说明 1.3.0 以来测试钩子可靠性、Windows 路径与事件循环有系统性改善，不能据 changelog 推断该缺陷已消除。必须在独立分支用最小复现（`afterEach` 内对主池执行 `SELECT 1`）在目标版本实测：若仍挂起或重建池仍崩溃，保留独立短连接缓解路径，并向官方 issue 反馈复现样本。

### 3.4 附：process.env 单进程共享串扰历史复核

- **机理**：bun 1.2.0 单进程内顺序执行多文件，进程级 `process.env` 跨文件共享；个别校验非演示/生产分支的用例临时置 `DEMO_MODE='0'` 或删除变量，其还原钩子在并发/异常时序下未彻底生效，残留非演示取值污染后续只读演示用例（药品/知识检索工具误判非演示模式，走进未接 `unsafe` 的测试态仓储路径，抛 `db.unsafe is not a function`）。
- **现状兜底**：`testEnv.ts` 全局 `beforeEach` 在非真实模式下复位 `DEMO_MODE='1'`；`TEST_REAL=1` 真实模式不被复位。污染源台账 7 文件（`consultAgentRepo` / `sessionRuntime` / `medmusePersist` / `globalRateLimit` / `wormKeyProvider` / `prodDemoFailClosed` / `wormKeysRoutes`）。
- **升级相关注意**：官方 `--isolate` 文档与 release notes **未明示**隔离后 `process.env` 是否跨文件重置；在实测确认前，全局 env 兜底钩子不能撤销。其余 env（`NODE_ENV` / `TRUST_PROXY` / `DATABASE_URL` / `WORM_*` 等）的跨文件残留尚未纳入本轮兜底，归测试隔离专项。
- **台账证据**：`reports/patrol/patrol-20261127-1228-mainline.md` 专项①。

---

## 4. 升级影响面评估

### 4.1 受影响脚本与入口

| 类别 | 位置 | 影响点 |
|---|---|---|
| 包脚本 | `package.json` scripts：`dev` / `dev:watch` / `build` / `start` / `start:server` / `bff` / `bff:watch` / `typecheck` / `test` / `test:unit` / `test:integration` / `test:e2e` / `test:watch` / `test:coverage` / `knowledge:*` / `db:*` / `security:audit` / `ci` / `prepare` | 均经 `bun` 运行；升级后行为、退出码、路径解析需逐件复核 |
| CI 工作流 | `.github/workflows/ci.yml`（6 处 `oven-sh/setup-bun@v2`，`BUN_VERSION: 1.4.2`）；`release.yml`（`bun-version: 1.4.2`，`bun install --frozen-lockfile`） | CI 版本标签需与本机升级目标对齐；锁文件门禁依赖 |
| 本机门禁脚本 | `scripts/gate-all.ps1`、`scripts/env-doctor.ps1`：bun 路径解析（PATH → `%USERPROFILE%\.bun\bin\bun.exe` fallback） | 路径解析逻辑不依赖具体版本，但版本探测输出口径需复核 |
| 测试基础设施 | `tests/support/testEnv.ts`：全局 `beforeEach` 复位 DEMO_MODE；进程末尾 `afterAll` 关池 | 隔离模型变化后需复核兜底是否保留/可收紧 |
| 连接池模块 | `src/db/pool.ts`：模块级单例 `_sql`、`closeDbForTest`、`releaseTestVisit`、`execTestCleanup` | M48-A 缓解路径；升级后复核重建池不崩溃、独立短连接行为正常 |
| 测试过滤配置 | `bunfig.toml`：`pathIgnorePatterns` 剪枝兜底、`preload` | 升级 ≥1.2.10 并实测锚定行为后，方可改用 `./tests/unit` 前缀锚定；当前兜底不可撤 |
| 锁文件 | `bun.lock`（`lockfileVersion: 2`） | 升级后需 `bun install` 重解析，复核传递依赖漂移；release 门禁 `--frozen-lockfile` |
| 前端 / 其他语言 | `web/`：npm + vitest + Vite + Playwright，独立工具链；`services-java`（Maven）、`services-python`（pytest）独立 | **不受 Bun 运行时升级直接影响** |

### 4.2 版本一致性待对齐项

1. `engines.bun >=1.3.0`、`packageManager bun@1.4.2`、`bun-types 1.3.11`、本机运行时 1.2.0 四者当前互不对齐；升级方案需明确目标版本并一次性对齐。
2. CI 缓存 key 仍以 `bun.lockb` 为哈希输入（`ci.yml` 第 50、77 行），而仓库实际跟踪文本锁 `bun.lock`——既有观察项，建议随升级复核一并修正缓存键。

### 4.3 隔离模型切换的潜在行为变化

- 若后续启用 `--isolate` / `--parallel`：跨文件模块级状态、长驻句柄、模块作用域副作用的用例行为可能改变；现有依赖"单进程顺序执行、模块单例复用"的集成测试需先在串行模式回归通过，再评估隔离模式。
- `--parallel` 下 worker 自带 `--isolate`，覆盖率/JUnit 合并语义与串行模式不同；CI 分片策略需配套。

---

## 5. 升级前回归清单（独立分支执行，逐条留痕真实退出码）

> 基线口径来自 2026-11-27 台账；回归时先在目标版本重测并记录对照，禁止用历史基线顶替本轮结果。

1. **全量 unit 原生汇总**：`bun test tests/unit`，记录 pass / fail / errors 三项总数与文件集合；对照现基线 **16677 pass / 163 fail / 113 errors**。113 个 errors 为 1.2.0 子串误纳 `web/tests` 的环境性失败；升级后不得新增后端环境性 fail，web 误纳项是否随前缀锚定消失需单独记录。
2. **三目标族串行回归**：unit / integration / e2e 分别按"独立进程"与"同进程串行"两口径复跑；确认无 hang、无 postgres.js 堆崩溃、无句柄泄漏导致进程悬挂。
3. **integration 真实模式**：`TEST_REAL=1` + `DEMO_MODE=0` 直连本地 PG（`127.0.0.1:5433/jlmedaios`）；`real-persistence` 真实 CRUD 通过；历史 16 件同进程串行批次 **232 pass / 0 fail / 625 expect** 基线复核。
4. **前后端类型门禁**：根 `tsc --noEmit`（TS 6.0.2）零类型错误；`bun run --cwd web typecheck`（TS 5.6.3）零类型错误。
5. **ESLint / Prettier 基线**：`eslint src` **errors 1291 持平不新增**；warnings 不新增（近期台账区间约 3385–3436，以回归当时实跑为准）；`format:check` 不新增格式差异。
6. **安全审计双路径**：`bun audit --audit-level=high`（原生路径）与 `npm audit --omit=dev`（兜底路径）分别跑通，记录输出与退出码。
7. **生产构建**：`bun run build` 产物 `dist/` 正常；`prepare` 钩子无异常。
8. **历史缺陷探针复核**：
   - M48-A 最小复现：`afterEach` 内主池 `SELECT 1` 在目标版本是否挂起；`closeDbForTest` 重建主池是否触发崩溃；
   - env 串扰复现：污染源 + 受害者组合 4 文件历史 **61 pass / 0 fail** 基线复核。
9. **版本一致性核对**：`bun --version`、`engines.bun`、`packageManager`、`bun-types` 版本与 CI `BUN_VERSION` 逐项比对并记录。

---

## 6. 风险点与前置条件

### 6.1 风险点

| # | 风险 | 说明与量级判断 |
|---|---|---|
| R1 | **bun-types 与运行时错配** | 类型包须与运行时同大版本；错配会出现 `bun:test` / `Bun.*` 类型缺失或签名错位，干扰 `tsc` 门禁判读。 |
| R2 | **Windows 平台差** | M48-A 未证实修复；本机 Windows 是主要开发/巡检环境，CI 跑 ubuntu，存在"Linux 绿、Windows hang"的分叉。升级前必须在 Windows 本机实测，不能只看 CI。 |
| R3 | **本地/CI 版本再次分叉** | 现状即本机 1.2.0 vs CI 1.4.2；升级目标版本须与 CI `BUN_VERSION`、`packageManager` 统一，避免新分叉。 |
| R4 | **锁文件漂移** | `bun.lock` 重解析可能改变传递依赖版本；`release.yml` 走 `--frozen-lockfile`，升级 PR 须含锁文件更新并复核依赖树差异。 |
| R5 | **Node 上报版本跳变** | 1.3.0 上报 Node 24.3.0、1.4.0 上报 Node 26；按 `NODE_MODULE_VERSION` 选预编译原生插件的包需复核。本仓依赖以纯 JS 为主（postgres.js、ioredis、undici、ws、axios、zod、sm-crypto 等），风险偏低，但需逐一扫描确认。 |
| R6 | **测试语义收紧** | CI 环境下 focused test / 快照变更会报错；`-t` 无匹配由静默成功改为报错；既有脚本若依赖旧行为需调整。 |
| R7 | **隔离模型切换副作用** | `--isolate` 关闭 socket/定时器/子进程并重建 global；现有依赖跨文件模块级状态的测试行为可能变化；启用前必须先串行回归。 |
| R8 | **postgres.js 崩溃/挂起历史** | 升级后复核 `closeDbForTest` 重建池路径不再触发堆崩溃；独立短连接清理路径在目标版本读循环正常。 |
| R9 | **audit 行为差异** | 内置 `bun audit` 自 1.2.15 起；`bun audit fix` 自 1.4.0 起；不同版本 audit 输出口径、`--audit-level` 参数兼容范围需实测记录。 |
| R10 | **env 隔离口径未明** | `--isolate` 是否重置 `process.env` 官方文档未明示；在证实前，`testEnv.ts` 兜底钩子保留；其余 env 跨文件残留未纳入兜底。 |

### 6.2 升级前置条件（必须先满足，否则不动运行时与锁文件）

1. 切**独立分支**（不在 `consult-agent-m86` 直接试升），固定目标 Bun 版本；建议先与 CI 现状对齐 **1.4.2**，是否评估更新的 1.4.x（1.4.4 / 1.4.5）另行拍板。
2. **M48-A 最小复现**在目标版本通过：afterEach 池查询不挂起、重建主池不崩溃；若仍复现，保留独立短连接缓解，并整理复现样本向官方反馈。
3. 第 5 节回归清单全绿：unit / integration / e2e 三族两口径、前后端 tsc 双零、ESLint 1291 errors 不新增。
4. `bun-types` 配套到同大版本；`bun.lock` 重解析通过 `--frozen-lockfile` 门禁复核，依赖树差异留档。
5. 评估并决定是否启用 `--isolate` / `--parallel`；在隔离模式行为确认前，env 与连接池兜底钩子维持现状。
6. 拍板本地与 CI 版本对齐方案（统一 `BUN_VERSION`、`packageManager` 与本机安装版本）。
7. 记录升级前后已知行为变更：Node 上报版本、audit 输出口径、测试过滤收紧、Windows 定时器/网络语义。

---

## 7. 结论

**当前不建议在未做独立分支全量回归前升级 Bun 运行时。**

- 现状是本机 1.2.0 与声明下限（≥1.3.0）、packageManager（1.4.2）、CI（1.4.2）三方分叉；M48-A 与 env 串扰的结论仅在 1.2.0 上成立。
- 1.3.0 以来测试钩子可靠性、Windows 兼容性、测试隔离模型（`--isolate` / `--parallel`）与审计工具有系统性改善；但 **M48-A 未定位到明确官方修复版本**，不能据 changelog 推断已修复。
- 升级属于"运行时 + 类型包 + 锁文件 + CI 标签"联动变更，必须在独立分支按第 5 节清单取证、按 6.2 节条件收口后，方可合入；本轮不执行任何升级与锁版本改动。

### 7.1 未决 / 需拍板项

- **目标版本**：对齐 CI 的 1.4.2，还是评估最新 1.4.x（1.4.4 / 1.4.5）。
- **隔离模式**：是否随升级启用 `--isolate` / `--parallel`；启用范围（仅 CI 还是本地一并）。
- **env 兜底扩面**：`NODE_ENV` / `TRUST_PROXY` / `DATABASE_URL` / `WORM_*` 等其余 env 的跨文件残留是否纳入全局复位。
- **filter 误纳根治**：升级后是否借前缀锚定收敛 113 个 `web/tests` 误纳 errors，并相应精简 `pathIgnorePatterns`。
- **CI 缓存键**：`bun.lockb` → `bun.lock` 修正是否随升级一并落地。
- **原生插件扫描**：升级前是否需要专项排查依赖中按 `NODE_MODULE_VERSION` 选预编译产物的包。

---

## 附录 A：本轮引用的官方与第三方来源

| 主题 | URL |
|---|---|
| Bun v1.2.10 release notes | <https://bun.sh/blog/bun-v1.2.10> |
| Bun v1.2.11 release notes | <https://bun.sh/blog/bun-v1.2.11> |
| Bun v1.2.15 release notes（内置 `bun audit`） | <https://bun.sh/blog/bun-v1.2.15#bun-audit> |
| Bun 1.3 release notes | <https://bun.sh/blog/bun-v1.3.0> |
| Bun v1.3.13 release notes（`--isolate` / `--parallel` / `--shard` / `--changed`） | <https://bun.sh/blog/bun-v1.3.13> |
| Bun 1.4 release notes | <https://bun.sh/blog/bun-v1.4> |
| `bun-types` npm 包（锁步版本发布） | <https://www.npmjs.com/package/bun-types> |
| Bun 官方测试文档（Writing tests） | <https://bun.sh/docs/test/writing> |
| commit 级 changelog 镜像（交叉核对） | <https://kt3k.github.io/changelog/oven-sh/bun/> |

> 备注：本地台账引用的 oven-sh/bun#5969（filter 前缀锚定）对应 GitHub issue 页面在本轮调研环境被 robots.txt 限制，未能直接读取；其修复版本归属以独立分支实测为准，本文未将其作为已核实结论。

## 附录 B：本地证据指针

- `package.json`：第 35、38、95 行（engines / packageManager / bun-types）
- `bunfig.toml`：第 7–17 行（test filter 与 pathIgnorePatterns 注释口径）
- `src/db/pool.ts`：第 27–126 行（单例池与 `closeDbForTest`）；第 128–214 行（M48-A 缓解：`releaseTestVisit` / `execTestCleanup`）
- `tests/support/testEnv.ts`：第 23–60 行（DEMO_MODE 复位兜底、进程末尾关池兜底）
- `reports/patrol/patrol-20261125-1504-mainline.md`：专项① M48-A 连接池生命周期评估与兜底落地
- `reports/patrol/patrol-20261127-1228-mainline.md`：专项① DEMO_MODE 跨文件 env 污染根治
- `.github/workflows/ci.yml`：第 23 行 `BUN_VERSION`；第 35、65、93、129、183、201 行 setup-bun；第 50、77 行缓存键
- `.github/workflows/release.yml`：第 33 行 bun-version；第 41 行 `--frozen-lockfile`

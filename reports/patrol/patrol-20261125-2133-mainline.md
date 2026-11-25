# 巡检简报 2026-11-25 21:33 轮（定时唤醒 · 限流选项 A 收口推送 · unit 残留逐文件甄别定性 · 三镜像核对 0/0）

## 概要
本轮在起点基线 `2ed89d4b`（origin / gitcode / mirror 的 `consult-agent-m86` 逐字一致、ahead/behind 0/0）上推进两项不涉拍板、可独立闭环的待办：①落地限流**选项 A**——测试侧 `afterAll` 复用既有 admin `/rate-limit/unlock` 回收本机 IP / 残留账号限流桶，零生产装配、不放松阈值；②对全量 unit 残留 169 fail / 113 errors 逐文件回溯堆栈归类，区分 bun 1.2.0 web 误纳、进程级 env 污染与真实断言失败。收口后跑前后端类型门禁与受影响 e2e 真实模式回归，分层提交并推送三远端，`git ls-remote` 逐字核对 SHA 一致、0/0。生产行为不变，未触碰待拍板表结构与上线契约。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端仓库根 TypeScript `6.0.2`；前端 `web/` 独立 TypeScript `5.6.3`。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）。本轮开场 5433 处于监听状态，8080 demo 实例 `/health` **200**；迁移记账 **350**、`iam.roles` **11**、`agent.workflow_instances` **0**，与基线一致。
- 起点基线 HEAD：`2ed89d4b4bca6461f35a167416a5027dcb3df38bc`；三远端 `ls-remote refs/heads/consult-agent-m86` 起点均为该 SHA，0 领先。

## 专项① 限流选项 A：e2e afterAll 经既有 admin unlock 清桶
- **背景**：跨进程打长驻 8080 的 e2e，进程内 `__resetRateLimitBuckets()` 钩子够不到 BFF 内存桶；`loginLockout-e2e` 制造 IP 风暴触发 429 后 `afterAll` 未解封，IP 桶残留 5 分钟，会影响后续登录类 e2e。
- **落地**：`tests/integration/loginLockout-e2e.test.ts` 补 `afterAll`——先 `GET /api/v1/rate-limit/status` 取实际封禁项，遍历 items：`type==='ip-login'` 调 `unlock` 传 `type:'ip'`，`type==='account'` 传 `type:'account'`；复用文件内已签 admin JWT；清理失败 try/catch 静默兜底，不掩盖主用例断言。
- **边界**：仅测试侧钩子；复用既有 admin 鉴权路由（`src/bff/routes/rateLimitAdmin.ts`），未新增生产端点、未放松 IP/账号阈值与窗口、未暴露生产可达清场/重置接口。
- **取证**：真实模式（`TEST_REAL=1` / `DEMO_MODE=0`）`loginLockout-e2e` **4 pass / 0 fail**；紧随其后串行跑 `p07TailLogin-e2e` **6 pass / 0 fail**，无 429，证明 IP 桶未跨用例残留；探针直连 `/status` 返回 `items=[]` 无残留。

## 专项② unit 残留逐文件甄别定性（只读回溯 + 单文件串行复核）
全量 `bun test tests/unit` 基线逐字一致：**16653 pass / 169 fail / 113 errors**（16822 tests / 2245 files，exit 1）。本轮改动仅在 e2e 测试文件、不在 unit 范围，计数与基线一致、无新增回归。

按失败堆栈全路径回溯归类：

| 类别 | 数量 | 定性 | 处置 |
|---|---:|---|---|
| 后端 `tests/unit` 真实断言失败 | **0** | — | 无需修复断言 |
| 后端 tests/unit 进程级 env 污染 | **6 用例 / 2 文件** | `TypeError: db.unsafe is not a function` | 单文件串行全绿，属跨文件 env 污染（见下），不为凑绿改断言 |
| web 误纳 fail（DOM / 适配器缺失） | 其余 fail | ReferenceError 69（`navigator` / `localStorage` / `document` / `Blob` 等未定义）+ TypeError 4 + 部分超时挂起 | bun 1.2.0 子串匹配误纳 `web/tests` 前端测试到 node 环境，环境性，维持基线 |
| web 误纳 errors | **113** | web 测试文件加载错误 | 同上，待 bun ≥1.2.10 前缀锚定根治 |

- **后端 6 例复核**：`tests/unit/knowledge/searchMedicalKnowledge.test.ts`（3）、`tests/unit/medical-tools/getDrugInfo.test.ts`（3）。错误栈均止于 `src/db/repositories/drugRepo.ts:52` 调用 `db.unsafe(SELECT_COLS)`。
  - **单文件串行复核**：`getDrugInfo.test.ts` 单独跑 **4 pass / 0 fail**；`searchMedicalKnowledge.test.ts` 单独跑 **9 pass / 0 fail**。证明用例自身无缺陷。
  - **根因定性**：全量进程内某前序 postgres 路径测试把进程级 `process.env.DEMO_MODE` 置为 `'0'` 且还原钩子在 bun 1.2.0 并发 / 顺序下未彻底生效，导致本批药品工具误判为非演示模式，走进 `drugRepo` 真实仓储路径；测试态 `getDb()` 返回的执行器未实现 `unsafe` 方法，遂抛 TypeError。候选污染源：`tests/unit/consult-agent/consultAgentRepo.test.ts:395`（`makeRepo()` 置 `DEMO_MODE='0'`，`afterEach` 418-421 还原）、`tests/unit/consult-agent/sessionRuntime.test.ts:85` 等 env 改写点。
  - **处置边界**：属测试隔离 / 环境性问题，非生产缺陷；本轮未在消费方硬编码 env 掩盖污染源，未放松断言。env 改写还原钩子的彻底性根治归入测试隔离专项（与 M48-A afterEach pump 同批评估）。
- 经文件系统实测：`request / storage / auth / download / format / useOnlineStatus` 等失败用例在后端 `tests/` 下**不存在**，均位于 `web/tests`，确认为 web 误纳而非后端副本。

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 结果 | 退出码 |
|---|---|---:|
| 后端根 `tsc --noEmit`（TS 6.0.2） | 0 条 error TS | **0** |
| 前端 `bun run --cwd web typecheck`（TS 5.6.3） | 0 条 error TS | **0** |
| `loginLockout-e2e`（真实模式） | 4 pass / 0 fail | **0** |
| `p07TailLogin-e2e`（紧随串行，真实模式） | 6 pass / 0 fail，无 429 | **0** |
| unit 全量 | 16653 / 169 / 113（与基线逐字一致） | 1 |

## 分层提交与三镜像核对
| 提交 | 范围 |
|---|---|
| `a5aa834f` test(isolation) | `loginLockout-e2e.test.ts` afterAll 经现有 admin unlock 回收 IP/账号限流桶（1 file，+20/-1） |

- 推送：origin（GitCode https）`2ed89d4b..a5aa834f`；mirror（GitHub ssh）`2ed89d4b..a5aa834f`；gitcode 与 origin 同仓 `Everything up-to-date`。
- `git ls-remote <r> refs/heads/consult-agent-m86` 逐字核对：origin / gitcode / mirror SHA 均为 `a5aa834fa6d200604ebdf89785e76c373b00fbd7`，`HEAD...<r>/consult-agent-m86` **ahead/behind 0/0**。
- 推送前 `git status --porcelain` 复核：tracked modified 0；133 个 untracked 全为探针 / 留痕脚本，未被 `git add`。

## 红线复核（拍板 / 裁决前未擅动）
- 未放松生产限流阈值与窗口；未新增或暴露生产可达的清场 / 全量重置端点；选项 B（仅非生产注册全量桶重置端点）待生产不可达评审，本轮不落地。
- 未 ALTER / DROP 既有表、未回填、未改上线契约；四套漂移 DDL（256 / 349 / 350 / 369）与 339 选型、`role_permissions` 全量镜像三前置、medical-qc 详情组装四项、web→TS6 对齐、出参子字段粒度与预留错误码等，均维持待拍板。
- 审计链断点（seq 1647 指向 seq 1000）未清表、未重算、未改链算法。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **审计链残留**：方案 1（本地测试库清表重建）/ 方案 2（按 seq 整条重算）需确认无留存取证数据、执行前备份、显式授权后复测 5 条转绿；方案 3 生产根因修复留专项评审。
- **测试隔离专项**：进程级 `DEMO_MODE` 等 env 改写的还原钩子彻底性根治（bun 1.2.0 并发 / afterEach pump 窗口）；M48-A afterEach pump 根因随 bun 升级复核；其余长驻演示内存聚合器跨轮残留持续观察。
- **工具链待办**：web 独立 TS 5.6.3 与根 TS 6.0.2 版本对齐需专项评估 antd5 / React19 / vitest 兼容回归后再决策；bun 1.2.0 路径子串匹配误纳 web 待升级 ≥1.2.10 前缀锚定根治。
- **代码质量待办**：存量 `any` 收窄；生产裸 `console.log` 甄别后迁结构化日志（启动 / 迁移 / 访问 / 审计类保留可观测性）；未使用导出 / 死代码跨文件扫描；server.ts 剩余不可考注释乱码。
- **未入库产物**：本轮临时探针 / 扫描件（`_rep12_*`）、历史 patrol 切片、schema 备份、lint 扫描 JSON、`docs/TODO_LEDGER.md`、`scripts/_*.py` 一次性 codemod 脚本不入库；docs CRLF→LF 历史漂移不专门提交。

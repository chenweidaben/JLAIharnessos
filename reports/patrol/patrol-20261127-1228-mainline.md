# 巡检简报 2026-11-27 12:28 轮（定时唤醒 · DEMO_MODE 跨文件 env 污染根治 · 后端 6 例转绿 · 三镜像核对 0/0）

## 概要
本轮在起点基线 `50f70d05`（origin / gitcode / mirror 逐字一致、0/0）上，优先根治上一轮定性的 6 例后端 unit env 污染。根因：bun 1.2.0 单进程内多文件共享 `process.env`，个别校验非演示 / 生产分支的用例临时置 `DEMO_MODE='0'` 或删除，其还原钩子在并发 / 异常时序下未彻底生效，残留非演示取值污染后续只读演示用例。处置：在测试基础设施 preload 层注册全局 `beforeEach` 兜底复位演示模式（不在受害消费方硬编码 env、不放松断言）。全量回归后端 env 污染 6 例全部转绿，无新增回归；前后端类型门禁双 0。随后做存量工程债只读甄别概览（不批量强改）。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端根 TypeScript `6.0.2`；前端 `web/` 独立 TypeScript `5.6.3`。
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码），本轮未写库；迁移 **350**、`iam.roles` **11**、`agent.workflow_instances` **0**，沿用基线。
- 起点 HEAD：`50f70d051cb600919450667b74f5f62fea3c6fd3`；三远端起点一致，0 领先。

## 专项① DEMO_MODE 跨文件 env 污染根治
- **失败现象**：`tests/unit/medical-tools/getDrugInfo.test.ts`（3）、`tests/unit/knowledge/searchMedicalKnowledge.test.ts`（3），`TypeError: db.unsafe is not a function`，栈止于 `drugRepo.ts:52`。单文件串行分别 4 pass / 9 pass 全绿，全量进程内失败。
- **机理复核**：`clinicalData.isDemoMode()` 运行时读 `process.env.DEMO_MODE`（非模块快照）。污染使判定为非演示，工具走进 `clinicalData.searchDrugs → drugRepo` 真实仓储分支；测试态执行器未实现 `unsafe`，遂抛 TypeError。非测试 mock 缺口、非生产接口缺陷。
- **污染源台账**（文件内 afterEach/afterAll 还原，本轮未改其断言与用例）：
  - `consult-agent/consultAgentRepo.test.ts:395` `makeRepo()` 置 `'0'`，afterEach 还原快照；
  - `consult-agent/sessionRuntime.test.ts:85` 置 `'0'`/delete，afterEach 还原；
  - `medmusePersist.test.ts:31` delete，afterEach 还原；
  - `globalRateLimit.test.ts:69/77/86/95` delete，afterEach 还原；
  - `wormKeyProvider.test.ts:37` delete，afterAll 还原；`prodDemoFailClosed.test.ts`、`wormKeysRoutes.test.ts` 同属 env 改写文件。
- **处置（隔离基础设施层兜底）**：`tests/support/testEnv.ts` 抽取 `REAL_MODE = TEST_REAL === '1'`；注册全局 `beforeEach`——非真实模式每用例进入前 `process.env.DEMO_MODE = '1'`。用例自身 `beforeEach` / `it` 体内显式赋值在本钩子之后执行，不被覆盖；`TEST_REAL=1` 真实模式集成测试不被复位。未在受害消费方硬编码 env 掩盖污染源，未放松任何断言。
- **取证**：组合跑 consult-agent 污染源 + 两受害者 4 文件 **61 pass / 0 fail**；全量 unit 复跑后端 env 污染 **0** 例 fail；fail 文件集合 diff：本轮无新增 fail 文件，仅基线 2 个后端文件转绿。

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 加固前基线 | 加固后 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit`（TS 6.0.2） | 0 error | 0 error | **0** |
| 前端 `bun run --cwd web typecheck`（TS 5.6.3） | 0 error | 0 error | **0** |
| unit 全量 pass | 16671 | **16677** | — |
| unit 全量 fail | 169 | **163**（后端污染 6 转绿，余 web 误纳） | **1** |
| unit 全量 errors | 113 | **113**（web 加载误纳，持平） | — |
| 测试规模 | 16840 tests / 2247 files | 16840 tests / 2247 files | — |

- 单跑复核：`getDrugInfo` 4 pass、`searchMedicalKnowledge` 9 pass，全绿。

## 专项② 存量工程债只读甄别概览（本轮不批量强改）
- **存量 `any`**：src 粗扫 **41 处 / 16 文件**；Top：`codeQualityAggregator.ts`(10)、`outpatient.ts`(4)、`db/pool.ts`(4，postgres.js 类型边界故意宽松、带 eslint-disable)、`nqi.ts`(4)、`knowledgeRepo.ts`(4)。pool.ts 边界 any 不宜收窄；其余按域逐步类型化。
- **生产裸 `console.*`**：src 粗扫 **222 处**，多为启动 / 迁移 / 访问 / 审计类可观测性保留项；迁移结构化日志前需逐处甄别，启动 / 迁移 / 访问 / 审计类保留。
- **死代码 / 未使用导出**：待接 `noUnusedLocals` / eslint 未使用规则跨文件扫描出清单。
- **工具链待办（维持台账）**：web 独立 TS 5.6.3 与根 TS 6.0.2 对齐需专项评估 antd5 / React19 / vitest 兼容回归；bun 1.2.0 子串匹配误纳 web 待升级 ≥1.2.10 前缀锚定根治。

## 分层提交与三镜像核对
| 提交 | 范围 |
|---|---|
| `01e455cf` test(isolation) | `tests/support/testEnv.ts` 全局 beforeEach 兜底复位 DEMO_MODE（1 file，+21/-2） |

- 推送：origin（GitCode https）、gitcode（GitCode ssh，同仓 up-to-date）、mirror（GitHub ssh）。
- `git ls-remote <r> refs/heads/consult-agent-m86` 逐字核对三远端 SHA = 本地 HEAD，ahead/behind 0/0。
- 提交前暂存区复核：无探针 / 历史切片 / 备份 / 台账生成物误入；`docs/TODO_LEDGER.md` 仍不入库。

## 红线复核（拍板 / 裁决前未擅动）
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；审计链 seq 1647 断点复测（需测试库授权与备份）。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **其余进程级 env 残留**：本轮全局兜底仅复位 `DEMO_MODE`；`NODE_ENV` / `TRUST_PROXY` / `DATABASE_URL` / `WORM_*` 等改写的跨文件残留未纳入本轮兜底，归测试隔离专项同批评估。
- **Python 测试待复跑**：本机缺 pytest / fastapi / httpx 且无项目 venv，`test_api_key_middleware.py` 仅 py_compile 通过，pytest 结果待具备依赖环境复跑。
- **测试隔离专项**：污染源 afterAll（wormKeyProvider 类）可评估收紧为 afterEach 缩短污染窗口；M48-A afterEach pump 根因随 bun 升级复核；长驻演示内存聚合器跨轮残留持续观察。
- **代码质量待办**：存量 any 按域收窄（pool.ts 边界除外）；222 处裸 console 逐处甄别后迁结构化日志；未使用导出 / 死代码扫描；server.ts 注释乱码。
- **未入库产物**：本轮临时探针 / 扫描脚本（`_rep14_*`）、历史 patrol 切片、schema 备份、lint 扫描 JSON、`docs/TODO_LEDGER.md`、`scripts/_*.py` 不入库。

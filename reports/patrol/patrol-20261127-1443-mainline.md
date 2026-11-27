# 巡检简报 2026-11-27 14:43 轮（Record<string,any> 清零 · console 首批 9 处结构化迁移 · 死代码 AST 归类 · wormKeyProvider 用例级隔离 · 三镜像核对 0/0）

## 概要
本轮在干净基线 `2f8c800b`（三远端逐字一致、0/0、tracked 0）上续接台账可自主工程债：上一轮遗留的 7 处 `Record<string, any>` 全部按域收窄；首批 9 处 error/warn 裸 console 迁既有 `rootLogger` 结构化日志并补业务上下文；死代码候选接 eslint AST 复核，收敛为 248 个精确告警并按三类分级落清单（本轮未删除）；`wormKeyProvider` 测试钩子由 afterAll 收紧为 afterEach，污染窗口从文件级缩到用例级。后端 `tsc --noEmit` 与前端 web typecheck 双 0；受影响组合测试 **121 pass / 0 fail**；全量 unit **16677 pass / 163 fail / 113 errors**，与基线逐项持平，无新增回归。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端根 TypeScript 6.0.2；前端 `web/` TypeScript 5.6.3。
- 起点 HEAD：`2f8c800bb8c3c4aa3bb7827a904c5f1437ba3cfb`；三远端起点一致，0 领先 / 0 落后。

## 专项① 存量 Record<string, any> 收窄（7 处 / 4 文件，后端 tsc exit 0）
- `integration/protocols/fhir/FHIRResource.ts`（3）：`set` 动态路径遍历游标 `Record<string, any>` → `Record<string, unknown>`；`validateRequiredFields` 资源快照 `r` → `Record<string, unknown>`；去除两处 `no-explicit-any` 抑制。`get` 方法既有 `unknown` + 索引断言口径保持不变。
- `integration/protocols/fhir/FHIRBuilder.ts`（2）：`set` 游标与递归下钻断言收窄为 `Record<string, unknown>`，去除抑制注释。
- `bff/routes/empiFederated.ts`（1）：body 由 `Record<string, any>` 断言改为 `c.body<LinkInput>()`，复用聚合器既有入参接口。
- `bff/routes/xds.ts`（1）：body 改为 `c.body<RegisterInput>()`。
- 校验：`r.name` 经 `Array.isArray` 谓词收窄后取长度；其余字段仅 truthy 判断，unknown 可直接参与；未用 any 反向兜底、未放松 strict。
- 至此上一轮台账点名的 7 处 `Record<string, any>` 清零；src 内剩余类型 any 仅 `pool.ts` 4 处 postgres.js 泛型边界（按台账保留），`codeQualityAggregator.ts` 命中均为扫描规则文案字符串。

## 专项② console 首批迁移（9 处 / 5 文件，rootLogger 结构化）
迁移目标：`src/core/logging/Logger.ts` `rootLogger`（五级结构化，子上下文）。首批取内聚的聚合器降级留痕与核心事件总线，路由层同质 catch 留下一批。

| 文件 | 处 | 级别 | 结构化上下文 |
|---|---:|---|---|
| `bff/aggregators/doctorPreferenceAggregator.ts` | 2 | warn | doctorId + error（读取降级 / 重算保留原偏好） |
| `bff/aggregators/imAggregator.ts` | 1 | warn | messageId + error（解密失败回退占位串） |
| `bff/aggregators/keyOpsStore.ts` | 3 | warn | action/keyId、fileName + error（旧格式迁移 / 审计写入丢失 / 清理旧文件） |
| `bff/aggregators/notificationAggregator.ts` | 2 | warn | staffId(+id) + error（列表降级空列表 / 已读标记失败） |
| `core/events/AgentEventBus.ts` | 1 | error | eventType/sessionId + error（订阅者异常隔离） |

- 错误对象统一 `e instanceof Error ? e.message : String(e)` 入 fields，不再多参数裸打。
- 未迁移延续清单：路由层 `[bff error]` 同质 catch 60+ 处、审计/安全、启动装配、迁移、log/info/debug 类，按既有 `_rep15_console.md` 甄别保留；下一批迁路由 error 并补 traceId。

## 专项③ 死代码 AST 复核（eslint，248 告警分级，本轮未删除）
- 扫描 `eslint src`：存量 4809 problems（1291 errors / 3518 warnings），本批仅抽取 `@typescript-eslint/no-unused-vars`，共 **248** 处，较上一轮词法粗扫 4343 候选显著收敛。
- 分级（明细 `_rep16_deadcode_ast.md`，临时未入库）：
  - **A 未使用导入 / 函数 / 类型定义 89**：类型/值导入优先复核删除；文件内定义函数需先确认是否 `export` 与外部引用。
  - **B 未使用局部 const/let 53**：确认无模块级副作用后可删。
  - **C 未使用函数参数 106**：接口契约签名，禁止直接删形参；如需消告警按既有约定加 `_` 前缀。
- 复核口径：eslint 跨作用域静态解析；导出符号零外部引用仍需排除 barrel 重导出、动态字符串 / 反射 / 注册引用、同名碰撞与 web 目录未计入。本轮不删除任何符号。

## 专项④ 测试隔离收紧（wormKeyProvider afterAll → afterEach）
- 顶层 `beforeEach` 补 `__resetKeyProvider(null)`，清除上一用例残留单例；`afterAll` 还原拆为 `afterEach`：删当前 tmpDir、逐键还原 `ORIGINAL_ENV`、重置 provider；另留 `afterAll` 兜底二次还原。
- 污染窗口：密钥/provider/env 从文件级缩到用例级；子 describe 既有 afterAll（SM2 密钥、factory env）保留不动，与顶层 afterEach 幂等叠加。
- 复核：该文件 **29 pass / 0 fail / 63 expect**。

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit`（TS 6.0.2） | 0 error | 0 error | **0** |
| 前端 `bun run --cwd web typecheck`（TS 5.6.3） | 0 error | 0 error | **0** |
| empiXds + Fhir 组合 | — | 34 pass / 0 fail | **0** |
| console 迁移 5 文件组合 | — | 58 pass / 0 fail | **0** |
| wormKeyProvider 隔离收紧 | — | 29 pass / 0 fail | **0** |
| unit 全量 pass | 16677 | **16677** | — |
| unit 全量 fail | 163 | **163**（既有 bun 1.2.0 web 误纳，持平） | **1** |
| unit 全量 errors | 113 | **113**（web 加载误纳，持平） | — |
| 测试规模 | 16840 tests / 2247 files | 16840 tests / 2247 files | — |

- 全量 fail 尾部仍为 web DOM 缺失（localStorage / document / Blob / navigator）与超时挂起，与基线同源，无新增 fail 文件。

## 红线复核（拍板 / 裁决前未擅动）
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审；审计链 seq 1647 断点复测（需测试库授权与备份）。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **console 续迁**：路由层 `[bff error]` 同质 catch 60+ 处下一批迁 `rootLogger.error` 并补 traceId；审计 / 启动 / 迁移 / log/info/debug 类按清单甄别保留。
- **死代码分批**：A 类未使用导入先复核删除；B 类局部常量确认无副作用后清理；C 类参数加 `_` 前缀；删除前排除 barrel / 动态 / 反射引用。
- **隔离延伸**：其余 NODE_ENV / TRUST_PROXY / DATABASE_URL / WORM_* 维持文件内还原；下一轮逐文件核查还原钩子覆盖度与并发时序；M48-A Windows afterEach pump 根因随 bun 升级复核。
- **工具链只读方案（不擅自升级）**：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A；web→TS6 先评估 antd5 / React19 / vitest / typescript-eslint 兼容矩阵。
- **Python 测试待复跑**：本机缺 pytest / fastapi / httpx 且无 venv，`test_api_key_middleware.py` 仅 `py_compile` 通过，pytest 结果待具备依赖环境复跑，未伪造通过。
- **未入库产物**：本轮临时扫描 / 留痕脚本（`_rep16_*`）、历史 patrol 切片、schema 备份、lint 扫描 JSON、`docs/TODO_LEDGER.md`、`scripts/_*.py` 不入库；两个 CRLF 噪音文件未暂存。

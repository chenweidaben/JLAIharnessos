# 健澜AI原生医院操作系统OS · consult-agent 深化专项覆盖率实测对比报告（round 1）

- 分支：`consult-agent-m86`
- 落档日期：2026-10-26
- 口径说明：本报告全部覆盖率数字逐字摘自两份 bun 覆盖率落档日志，未做估算、未填默认值；bun text reporter 不提供 statements / branches 独立百分比列，凡涉及该两维的结论均标注「本环境 reporter 未提供该维度」，不虚构数字。

## §1 实测口径与环境

### 1.1 执行命令与运行环境

覆盖率运行命令（基线与本轮同口径，三目录）：

```
bun test --coverage --coverage-reporter text tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent
```

- 运行时：`DEMO_MODE=1`；bun 绝对路径 `C:\Users\lenovo\.bun\bin\bun.exe`，日志首行版本 `bun test v1.2.0 (b0c5a765)`。
- 存储与外部依赖：不连接真实 PostgreSQL；环境内无 LLM 凭证；未做真实 SSE / HTTP 联调；会话、消息、草稿、审计、画像、文档均由进程内 DEMO 仓储（模块级 `SessionRuntime` 单例）承载。
- reporter 口径：bun text reporter 仅输出 `% Funcs`、`% Lines`、`Uncovered Line #s` 三列，**不输出 statements 与 branches 独立百分比列**；本报告不提供该两维数字，需要该两维结论处一律标注「本环境 reporter 未提供该维度」。

### 1.2 落档日志对照

| 用途 | 本仓库日志路径 |
| --- | --- |
| 基线覆盖率 | `reports/consult-deepen/baseline-coverage-round0.log` |
| 本轮覆盖率 | `reports/consult-deepen/coverage-round1.log`（对应 `gate.ps1` §7 COVERAGE 段口径，内容与本仓库 persisted 巡检落档 `reports/consult-deepen/patrol-20261026-0019/patrol-coverage.log` 逐字一致） |
| 本轮功能测试汇总 | `reports/consult-deepen/patrol-20261026-0019/patrol-bun-test-r2.log`（对应 `gate.ps1` §6 BUN_TEST 段口径） |

落档说明：门禁脚本 `scripts/consult-agent/gate.ps1` §6（BUN_TEST → `gate-6-bun-test.log`）、§7（COVERAGE → `gate-7-coverage.log`）定义的分段日志在 `round1-gate/` 目录下不存在（该目录当前无落档文件）；本轮覆盖率与功能测试数字分别取自上表所列本仓库 persisted 巡检落档日志，命令参数、`DEMO_MODE` 与脚本定义一致。

### 1.3 测试规模对照（逐字摘自日志尾部汇总行）

| 运行 | pass | fail | expect() 调用 | 测试文件数 | 耗时（日志逐字） |
| --- | --- | --- | --- | --- | --- |
| 基线覆盖率运行 | 177 | 0 | 659 | 15 | 11.84s |
| 本轮覆盖率运行 | 326 | 0 | 2090 | 26 | 19.68s |
| 本轮功能测试（无覆盖率） | 326 | 0 | 2090 | 26 | 17.63s |

> 说明：上表耗时逐字摘自落档日志尾部 `Ran ... across ... files. [xx.xxs]` 行；覆盖率运行与功能测试为两次独立执行，耗时含进程内 DEMO 仓储装载与 SSE 帧回放等待，两次运行时长存在自然波动。

## §2 汇总覆盖率对比（All files）

| 口径 | 基线 `% Funcs` | 本轮 `% Funcs` | 差值（pt） | 基线 `% Lines` | 本轮 `% Lines` | 差值（pt） |
| --- | --- | --- | --- | --- | --- | --- |
| All files | 84.49 | 88.81 | +4.32 | 85.25 | 91.20 | +5.95 |

差值按两份日志 All files 汇总行同口径相减：`88.81 − 84.49 = 4.32`，`91.20 − 85.25 = 5.95`；两列均为 bun text reporter 同一口径汇总，未跨 reporter 换算。statements / branches 维度：本环境 reporter 未提供该维度。

## §3 consult 范围内文件级对照表

### 3.1 核心文件逐行对照（11 个）

ΔLines = 本轮 `% Lines` − 基线 `% Lines`，保留两位小数；「—」表示日志未列未覆盖行号。路径按日志原名转写为正斜杠。

| 源码文件（相对路径） | 基线 %Funcs | 基线 %Lines | 基线未覆盖行 | 本轮 %Funcs | 本轮 %Lines | 本轮未覆盖行 | ΔLines | 补测归属 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| src/bff/routes/consultAgentRoutes.ts | 94.87 | 87.65 | 97,101-102,109,150-154,160-161,185,210,212-227,258-261,322-325,392,394-404,520-523 | 94.87 | 98.14 | 150-154,160-161 | +10.49 | tests/integration/consult-agent/consultRouteErrors.test.ts（schema 入参 400、404 线程不存在与归属隔离、409 终态冲突、流式问诊 200 SSE 成功路径、mapConsultError 404/409/500 映射、草稿红线响应层）与 tests/integration/consult-agent/consultFlow.test.ts（创建会话 / 普通问诊编排 / 急症旁路 / 草稿链路 / 审计轨迹 / 事件回放主链路） |
| src/core/agent/consult/audit/index.ts | 83.33 | 94.12 | 27,38 | 100.00 | 100.00 | — | +5.88 | tests/unit/consult-agent/audit.test.ts（27 行嵌套对象递归脱敏分支、38 行嵌套数组元素递归脱敏分支，另覆盖条目构造与工具记录构造） |
| src/core/agent/consult/consultOrchestrator.ts | 100.00 | 92.20 | 67,131,257,292-307,343-346 | 100.00 | 98.98 | 67,257 | +6.78 | tests/unit/consult-agent/orchestratorBranches.test.ts（292-307 哨兵驳回分支、343-346 问候收集态分支、131 行 THREAD_NOT_FOUND 可达抛错分支） |
| src/core/agent/consult/llm/safeLlm.ts | 66.67 | 96.15 | —（日志未列行号） | 85.71 | 100.00 | — | +3.85 | tests/unit/consult-agent/safeLlm.test.ts（43-45 行 isAvailable 凭证探测三态、supervisor 空 prompt 兜底文案、四角色离线确定性补全、确定性输出与红线文案断言） |
| src/core/agent/consult/memory/profileMemory.ts | 100.00 | 92.39 | 127-132 | 100.00 | 100.00 | — | +7.61 | tests/unit/consult-agent/profileMemoryBranches.test.ts（127-132 药物不耐受事实抽取分支，另覆盖 135-137 preferred_language 分支） |
| src/core/agent/consult/roleSupport.ts | 71.43 | 51.28 | 31-36,41-53 | 100.00 | 100.00 | — | +48.72 | tests/unit/consult-agent/roleSupport.test.ts（31-36 makeEvidence 证据条目构造、41-53 roleDisplayName 全角色展示名映射） |
| src/core/agent/consult/runtime/sessionRuntime.ts | 75.00 | 76.77 | 27,141-153,160,165,170-176 | 92.11 | 100.00 | — | +23.23 | tests/unit/consult-agent/sessionRuntime.test.ts：isDemoMode 环境判定（基线 27 行）、画像持久化（基线 141 行）、文档读写（基线 147、151-153 行）、checkpoint 读写（基线 160-161、165-166 行）、clear 全量清空（基线 170-177 行） |
| src/core/agent/consult/supervisor.ts | 100.00 | 84.00 | 41-43 | 100.00 | 100.00 | — | +16.00 | tests/unit/consult-agent/supervisorBranch.test.ts（41-43 chronic_management / clarification_answer 路由医师，另覆盖 document_upload / unknown / acute_emergency / exit / 充分态症状主诉分支与 isSufficientForDoctor 阈值三态） |
| src/db/repositories/consultAgentRepo.ts | 37.84 | 14.69 | 40,98,102,111-124,128-141,145-162,166-179,183-189,193-203,208-399 | 94.00 | 99.05 | 98 | +84.36 | tests/unit/consult-agent/consultAgentRepo.test.ts（PostgresConsultRepo 13 方法 mock pool 契约：SQL 片段 / 列清单 / 蛇形转驼峰 / 空结果分支 / 错误透传），另由 tests/unit/consult-agent/ddlSchema.test.ts 静态对齐；DEMO 委托方法缺口见 §4 |
| src/core/agent/consult/tools/toolRegistry.ts | 94.59 | 100.00 | —（日志未列行号） | 97.30 | 100.00 | — | 0.00 | tests/unit/consult-agent/toolRegistryBranches.test.ts（188-190 register 同名覆盖、194 resolve 首尾空白归一、220-221 未声明 knownArgs 保留全参、253-259 invoke 异常安全降级、76 searchKnowledgeBase 空 query、109 lookupDrug 未命中、145-150 checkInteraction 单药与零药 / 标量、57-68 readStringArrayArg 混合类型与拆分） |
| src/core/agent/consult/intentClassifier.ts | 100.00 | 98.59 | —（日志未列行号） | 100.00 | 98.59 | —（日志未列行号） | 0.00 | 本轮无新增补测；与基线持平，遗留兜底分支见 §4.6 |

### 3.2 两轮均 100.00 / 100.00 覆盖清单（20 个文件）

下列文件在基线与本轮两份日志中 `% Funcs`、`% Lines` 均为 `100.00`，未覆盖行号列为空：

| 序号 | 源码 / 测试支撑文件（相对路径） |
| --- | --- |
| 1 | src/bff/permissions.ts |
| 2 | src/bff/types.ts |
| 3 | src/core/agent/consult/demo/demoSeed.ts |
| 4 | src/core/agent/consult/draftHash.ts |
| 5 | src/core/agent/consult/index.ts |
| 6 | src/core/agent/consult/memory/shortTermMemory.ts |
| 7 | src/core/agent/consult/roles/doctorRole.ts |
| 8 | src/core/agent/consult/roles/examinerRole.ts |
| 9 | src/core/agent/consult/roles/index.ts |
| 10 | src/core/agent/consult/roles/internal.ts |
| 11 | src/core/agent/consult/roles/pharmacistRole.ts |
| 12 | src/core/agent/consult/roles/supervisorRole.ts |
| 13 | src/core/agent/consult/safety/acuteVocabulary.ts |
| 14 | src/core/agent/consult/safety/safetyGate.ts |
| 15 | src/core/agent/consult/sentinel/sentinelGateway.ts |
| 16 | src/core/agent/consult/stateMachine.ts |
| 17 | src/core/agent/consult/tools/evidenceExtractor.ts |
| 18 | src/core/agent/consult/types.ts |
| 19 | tests/support/testEnv.ts |
| 20 | tests/unit/consult-agent/helpers.ts |

## §4 本轮未覆盖行清单与可达性裁决

以下条目均按本轮覆盖率日志列示的未覆盖行号逐条核对源码后裁决；不把不可达或环境未闭环的条目标注为「已覆盖」。

### 4.1 src/bff/routes/consultAgentRoutes.ts 150-154、160-161

- 源码语义：`openSseStream` 内 `ReadableStream` 的两个断流回调。
  - abort 监听回调（源码 150-158 行；本轮 reporter 列示未覆盖 150-154）：150 行 `c.req.signal?.addEventListener('abort', () => {`，回调体 151-157 行依次执行 `closed = true; if (timer) clearTimeout(timer); try { controller.close(); } catch { /* 流已关闭 */ }`，158 行闭合——客户端请求信号 abort 监听回调。
  - cancel 回调（源码 160-162 行；本轮 reporter 列示未覆盖 160-161）：`cancel() { closed = true; if (timer) clearTimeout(timer); }`——`ReadableStream` 被下游取消时触发的 cancel 回调。
- 裁决：当前 handler 层测试使用构造态 fake Request，无法模拟真实客户端中途断流或主动取消流；该两条回调需要 HTTP 层真实连接事件或浏览器网络事件才能触发，在现有进程内 DEMO 测试边界内不可达。不视为遗漏测试分支，留待真实 SSE/HTTP 联调阶段（见 §6）补覆盖。

### 4.2 src/core/agent/consult/consultOrchestrator.ts 67

- 源码语义：私有辅助函数 `transitionTo(thread, target)` 内的同状态早退防御：
  `if (thread.status === target) { return; }`（67 行 `return;`）。
- 裁决：编排器公开入口发起的状态迁移，目标态与当前态恒不相等（idle → collecting → clarifying / drafting → review_pending、escalated、closed / aborted 等均为合法出边），不存在公开入参可触发「同状态调用」；该 `return` 为防御性早退语句，测试边界内不可达。

### 4.3 src/core/agent/consult/consultOrchestrator.ts 257

- 源码语义：角色注册表取 supervisor 失败后的守卫抛错：
  `const supervisor = getRolePort(roleRegistry, 'supervisor'); if (!supervisor) { throw new Error('SUPERVISOR_ROLE_MISSING'); }`（257 行为 `throw` 语句）。
- 裁决：公开入口经 `buildRoleRegistry(ctx.llm)` 装配注册表，该工厂在 `roles/index.ts` 中硬编码注册 `supervisor`、`examiner`、`doctor`、`pharmacist` 四个角色；当前公开路径无法构造出缺失 supervisor 的注册表，该守卫在测试边界内不可达，属防御性 fail-closed 语句。

### 4.4 src/db/repositories/consultAgentRepo.ts 98

- 源码语义：98 行为 `DemoConsultRepo.listDocuments(threadId: string)` 方法声明，99 行委托 `return this.runtime.listDocuments(threadId);`，属 DEMO 进程内兜底实现的文档列表委托方法（与 `PostgresConsultRepo` 并列的演示模式分支，非真实 SQL 分支）。
- 未触达原因（按源码与测试静态核对，不编造测试结论）：
  - `tests/unit/consult-agent/consultAgentRepo.test.ts` 每个用例先将 `process.env.DEMO_MODE` 置为 `'0'`，工厂返回 `PostgresConsultRepo`，mock pool 契约测试不实例化 `DemoConsultRepo`；
  - DEMO 模式下路由与集成 / 安全用例经 `sharedRepo` 调用的方法清单中不包含 `listDocuments`；文档读写在测试中由 `tests/unit/consult-agent/sessionRuntime.test.ts` 直接在 `SessionRuntime` 上覆盖，不经仓储演示委托层；
  - 本轮日志仅列示 98 行为未覆盖行，99 行委托语句未列入未覆盖清单，归因不扩大。
- 裁决：演示模式仓储委托方法在当前测试边界内未被触达；不属真实 PostgreSQL 查询分支缺口，真实 DB 路径的闭环状态见 §6。

### 4.5 Funcs 维度残余缺口核对（safeLlm.ts / sessionRuntime.ts / toolRegistry.ts，Lines 均为 100.00）

三份文件本轮 `% Lines` 均为 `100.00`，无未执行语句行；`% Funcs` 仍有残余。经逐函数核对源码与测试调用点，公开具名函数 / 方法均已在本轮 DEMO 测试中被直接或间接调用，清单如下：

**src/core/agent/consult/llm/safeLlm.ts（本轮 Funcs 85.71，Lines 100.00）**

| 函数 / 方法 | 源码位置 | 调用证据 |
| --- | --- | --- |
| `createSafeLlm()` | 59 行工厂 | safeLlm.test.ts 直接调用 |
| `isAvailable()` | 43 行凭证探测 | safeLlm.test.ts 直接调用，覆盖三态：三凭证均无、任一凭证非空、空白串视为未配置 |
| `complete(prompt, role)` | 47 行离线补全 | safeLlm.test.ts 直接调用，覆盖四角色与 supervisor 空 prompt 兜底 |
| `roleTemplate(role, prompt)` | 25 行内部模板 | 由 `complete` 内部调用，随补全路径触达 |
| 内部谓词回调 `(key) => Boolean(process.env[key]?.trim())` | 44 行 `some` 回调 | 随 `isAvailable` 凭证遍历双分支执行 |

**src/core/agent/consult/runtime/sessionRuntime.ts（本轮 Funcs 92.11，Lines 100.00）**

公开方法 `findThread`、`listThreads`、`saveThread`、`createThread`、`listMessages`、`saveMessage`、`listDrafts`、`saveDraft`、`listAudit`、`saveAudit`、`getProfile`、`saveProfile`、`listDocuments`、`saveDocument`、`saveCheckpoint`、`getCheckpoint`、`clear` 中：除 `listThreads`、`saveThread` 由集成 / 安全用例经 sharedRepo 委托触达外，其余均经 sessionRuntime.test.ts 直接调用（`listMessages`、`listDrafts`、`listAudit` 两条路径均触达）；模块函数 `isDemoMode` 由环境判定用例直接调用；`createDemoRuntime` 由 sessionRuntime.test.ts 与编排器用例直接调用；方法内部 `filter` / `sort` 谓词随对应方法体执行。

**src/core/agent/consult/tools/toolRegistry.ts（本轮 Funcs 97.30，Lines 100.00）**

公开方法 `register`、`resolve`、`normalizeArgs`、`filterKnownArgs`（私有，经 `invoke` 调用）、`invoke`、`list`，模块函数 `createDefaultToolRegistry`、`snakeToCamel`、`readStringArg`、`readStringArrayArg`、`searchKnowledgeBase`、`lookupDrug`、`checkAllergy`、`checkInteraction`、`retrievePatientHistory`：经 toolRegistry.test.ts、toolRegistryBranches.test.ts 及编排 / 角色用例触达；五个内置工具描述符的 `run` 箭头经 `invoke` 调用进入执行路径。

**残余缺口裁决：** 上述三文件 Funcs 维度未被命中的跟踪单元，bun text reporter 不按函数名列示，本仓库可用落档仅有 `% Funcs` 汇总百分比，未提供函数级归属；按「禁止编造」纪律，本报告不为残余单元指派具体公开函数名。由于三文件 Lines 均为 100.00，残余 Funcs 缺口对应 bun 函数计数器口径下的内部回调 / 初始化单元计数差异，不构成未覆盖业务分支；statements / branches 维度：本环境 reporter 未提供该维度。

### 4.6 src/core/agent/consult/intentClassifier.ts（本轮 Lines 98.59，与基线持平）

- 日志口径：基线与本轮 `% Lines` 均为 `98.59`，两份日志未列未覆盖行号；本轮无新增补测，缺口非本轮引入。
- 源码核对：`classifyIntent` 内 116-117 行为「无关键词命中但处于 Examiner 追问上下文」兜底分支：`if (lastMessageIsExaminerFollowUp(history)) { return { intent: 'clarification_answer', confidence: 0.7, matched: [] }; }`。现有用例中，追问上下文用例（测试 56-63 行）携带症状词，走 108-109 行 `symptom_report` + 追问上下文分支；无关键词兜底用例（65-69 行）history 为空。117 行「未命中关键词 + 追问上下文」组合分支未被用例触达。
- 裁决：该行号为源码静态核对指向，reporter 未列出行号，不作为 reporter 实测行号引用；缺口与基线同值，属遗留分支，不计入本轮新增缺口。

## §5 边界文件（不计入 consult 覆盖率债务，单独列表）

下列文件属另一路 B 类后端改动与共享基础设施，不在 consult 深化分片内；本轮数字变化如实记录，不归功于 consult 补测。ΔLines 口径同 §3。

| 源码文件（相对路径） | 基线 %Funcs | 基线 %Lines | 基线未覆盖行 | 本轮 %Funcs | 本轮 %Lines | 本轮未覆盖行 | ΔLines | 归属说明 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| src/bff/config/runtimeEnv.ts | 0.00 | 20.00 | 17,22-23,31-35 | 0.00 | 20.00 | 17,22-23,31-35 | 0.00 | B 类后端 / 运行时环境配置，本轮无变化，不计入 consult 债务 |
| src/bff/middleware/auth.ts | 33.33 | 46.78 | 22-26,30-31,47-55,60,68-79,84-114,132-166,171-179,184-195,203-209 | 33.33 | 46.78 | 22-26,30-31,47-55,60,68-79,84-114,132-166,171-179,184-195,203-209 | 0.00 | 共享鉴权中间件，本轮无变化；consult 权限码由 tests/security/consult-agent/permissions.test.ts 在路由层覆盖，不代表本文件其余中间件分支已闭环 |
| src/db/pool.ts | 0.00 | 8.03 | 31-61,65-68,72-90,94-95,99-103,107-108,120-124,143-180,192-211 | 0.00 | 8.03 | 31-61,65-68,72-90,94-95,99-103,107-108,120-124,143-180,192-211 | 0.00 | 共享连接池，未连接真实 PostgreSQL；本轮无变化 |
| src/db/repositories/helpers.ts | 0.00 | 20.97 | 18-23,28-29,33,37,41,48,66-80,85-106 | 11.11 | 22.58 | 18-23,28-29,33,37,41,66-80,85-106 | +1.61 | 共享仓储辅助（QueryBuilder、toJson、buildSafeSetClause、dynamicSelect）；本轮 48 行 `toJson` 经 consult 仓储间接触达，其余动态 WHERE / 安全 SET / 动态 SELECT 分支仍未覆盖；该 1.61pt 涨幅归属共享基础设施，不计入 consult 补测成果 |

## §6 环境硬约束与未闭环项

以下约束在基线与本轮保持一致，覆盖率结论仅在该约束下成立：

1. **真实数据库未演练**：本机无运行中 PostgreSQL；迁移 380-385 六表（threads、messages、documents、diagnosis_prescription_drafts、audit_trail、profile_memory）的真实建表、真实连接与 SQL 执行未演练。`PostgresConsultRepo` 各方法当前仅以 mock pool 契约测试断言 SQL 片段、列清单、蛇形转驼峰映射、空结果分支与错误透传，不代表真实库表连通或真实查询通过；`src/db/pool.ts` 与共享 `helpers.ts` 的动态查询路径未纳入本轮闭环。
2. **在线 LLM 路径未演练**：环境内无 ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY 凭证；`safeLlm` 仅覆盖离线确定性降级路径，在线模型请求、响应解析、超时与重试链路未演练。
3. **真实 SSE / HTTP 联调未演练**：未启动真实 HTTP 服务做端到端联调；客户端中途断流、断线重连、超时降级、token 计量与节流均未覆盖；§4.1 的两条断流回调需在该阶段补覆盖。
4. **浏览器视觉走查未执行**：本轮覆盖率仅为后端进程内测试口径，不含前端页面渲染、交互走查与视觉回归结论。
5. **覆盖范围边界**：本轮覆盖率仅反映 `tests/unit/consult-agent`、`tests/security/consult-agent`、`tests/integration/consult-agent` 三目录在 DEMO 进程内仓储下的执行情况；前端 `web/` 与其他 B 类后端模块不在本分片口径内。
6. **基线遗留失败用例不计入本轮统计**：以下两条失败用例不在 consult 三目录内，本轮未修复、不计入本轮 pass / fail 与覆盖率口径：
   - F1：`tests/unit/onlineConsult.test.ts` 日期硬编码导致 1 fail；
   - F2：`tests/unit/db/ddl.test.ts` check-sql 对历史 M 系列 SQL 误报 1 fail。

## §7 结论

1. 本轮补测把 consult 范围核心模块的 Lines 覆盖率整体推高：All files `% Lines` 由 85.25 升至 91.20（+5.95pt），`% Funcs` 由 84.49 升至 88.81（+4.32pt）；11 个核心对照文件中 7 个 Lines 达到 100.00，仓储契约（99.05）、编排器（98.98）、路由层（98.14）处于高位。
2. 剩余未覆盖行性质明确，可归为三类：测试边界内不可达的防御语句（编排器同状态早退、supervisor 缺失守卫）；需要真实 HTTP / 浏览器网络事件触发的 SSE 断流回调；演示模式仓储中未被 mock pool 契约测试触达的委托方法。未发现需要在现有 DEMO 单元 / 安全 / 集成测试边界内继续补写而遗漏的核心业务分支。
3. 三个核心模块 Funcs 维度存在 reporter 未具名的残余计数单元（Lines 已 100.00），不对应未执行业务语句；意图分类器遗留 1 个「无关键词 + 追问上下文」兜底分支，与基线持平，非本轮新增缺口。
4. 真实 PostgreSQL、在线 LLM、真实 SSE/HTTP 联调、浏览器视觉走查均未闭环，当前数字只代表 DEMO 进程内测试口径；边界基础设施文件（runtimeEnv、auth、pool、共享 helpers）覆盖率未纳入 consult 分片债务。
5. 本报告不宣称 consult 范围全覆盖：上述不可达防御语句、环境未闭环项与遗留兜底分支需在后续真实环境联调与跨分片验收阶段逐项核销。

# consult-agent M86 测试覆盖矩阵

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 本文是 [06-test-strategy.md](./06-test-strategy.md) 的落地覆盖对照：分层说明、源码模块 → 测试文件映射、覆盖率数字、未覆盖行可达性裁决、边界文件与环境缺口。覆盖率数字**逐字取自** `reports/consult-deepen/coverage-round1.md`（下称「覆盖率报告」）§2、§3、§4、§5、§6；本文不沿用基线估算，不编造 reporter 未提供的维度。

## 1. 测试分层与执行口径

### 1.1 三目录分层

| 目录 | 定位 | 测试范式 | 存储口径 |
|---|---|---|---|
| `tests/unit/consult-agent/` | 核心包纯函数、角色、安全闸、哨兵、记忆、工具注册表、草稿哈希、意图分类、状态机、DEMO 种子、zod schema、仓储 mock 契约 | `bun:test`（`describe` / `it` / `expect`） | 进程内 DEMO 仓储，不连真实 PostgreSQL、不联网 |
| `tests/security/consult-agent/` | 12 端点权限码门禁（401 / 403 断言）、写操作三件套口径 | `bun:test`，最小 fake `Ctx` 驱动 handler | 进程内 DEMO 仓储 |
| `tests/integration/consult-agent/` | E2E 主链路（创建会话 → 问诊 → 草稿 → 审计 → 回放）与路由错误分支（400 / 404 / 409 / 500 映射、归属隔离、SSE 成功路径） | `bun:test`，最小 fake `Ctx` 驱动 `consultAgentRoutes` handler | 进程内 DEMO 仓储；不做真实 SSE 网络联调 |

### 1.2 执行规模（覆盖率报告 §1.3，逐字摘自日志尾部汇总行）

| 运行 | pass | fail | `expect()` 调用 | 测试文件数 | 耗时（日志逐字） |
|---|---|---|---|---|---|
| 基线覆盖率运行 | 177 | 0 | 659 | 15 | 11.84s |
| 本轮覆盖率运行 | 326 | 0 | 2090 | 26 | 19.68s |
| 本轮功能测试（无覆盖率） | 326 | 0 | 2090 | 26 | 17.63s |

- 分段执行 pass：unit 210、security 69、integration 47（合计 326，与上表汇总一致；分段数字取自分段巡检日志，覆盖率报告 §1.3 仅落档汇总行，分段口径以 `reports/consult-deepen/patrol-20261026-0019/` 分段日志为准）。
- 运行环境：`DEMO_MODE=1`；bun 绝对路径 `C:\Users\lenovo\.bun\bin\bun.exe`，日志首行版本 `bun test v1.2.0 (b0c5a765)`（覆盖率报告 §1.1）。

### 1.3 覆盖率汇总（覆盖率报告 §2，All files）

| 口径 | 基线 `% Funcs` | 本轮 `% Funcs` | 差值（pt） | 基线 `% Lines` | 本轮 `% Lines` | 差值（pt） |
|---|---|---|---|---|---|---|
| All files | 84.49 | 88.81 | +4.32 | 85.25 | 91.20 | +5.95 |

> **statements / branches 维度**：bun text reporter 仅输出 `% Funcs`、`% Lines`、`Uncovered Line #s` 三列，**不提供 statements 与 branches 独立百分比**；本文不提供该两维数字，需要该两维结论处一律标注「本环境 reporter 未提供该维度」（覆盖率报告 §1.1、§2、§4.5）。

### 1.4 计数口径区分（防止两组数字冲突）

- **执行口径**：§1.2 的 pass / `expect()` 数为 bun 运行时展开结果（含 `it.each`、循环构造用例），以覆盖率报告 §1.3 日志汇总行为准。
- **静态口径**：下文矩阵「静态 `it` / `expect` / `describe`」列为对测试源码做正则计数（`^\s*it(`、`^\s*expect(`、`^\s*describe(`）所得条目数，用于文件级映射展示；静态条目数与运行时展开数不要求相等，两组数字不互相替代。
- 覆盖率 `% Funcs` / `% Lines` 与未覆盖行号一律以覆盖率报告 §3、§4 落档日志为准，本文不现场跑测取数。

## 2. 核心文件覆盖矩阵（覆盖率报告 §3.1，11 个核心文件）

| # | 模块 | 源码文件（相对路径） | 对应测试文件（静态 `it` / `expect` / `describe`） | 本轮 `% Funcs` | 本轮 `% Lines` | 本轮未覆盖行 | 未覆盖行号与可达性裁决（覆盖率报告 §4） |
|---|---|---|---|---|---|---|---|
| 1 | BFF 路由层 | `src/bff/routes/consultAgentRoutes.ts` | `tests/integration/consult-agent/consultRouteErrors.test.ts`（30 / 192 / 8）；`tests/integration/consult-agent/consultFlow.test.ts`（7 / 91 / 1） | 94.87 | 98.14 | 150-154、160-161 | §4.1：150-154 为 `openSseStream` 的 `abort` 监听回调，160-161 为 `ReadableStream` `cancel` 回调；fake Request 无法模拟真实中途断流 / 主动取消，需 HTTP 层真实连接事件或浏览器网络事件触发，**测试边界内不可达**，留待真实 SSE / HTTP 联调补覆盖 |
| 2 | 审计 | `src/core/agent/consult/audit/index.ts` | `tests/unit/consult-agent/audit.test.ts`（7 / 44 / 4） | 100.00 | 100.00 | — | 27 行嵌套对象递归脱敏、38 行嵌套数组元素递归脱敏分支已补测；条目构造与工具记录构造同文件覆盖 |
| 3 | 编排器 | `src/core/agent/consult/consultOrchestrator.ts` | `tests/unit/consult-agent/orchestrator.test.ts`（8 / 44 / 1）；`tests/unit/consult-agent/orchestratorBranches.test.ts`（3 / 33 / 3） | 100.00 | 98.98 | 67、257 | §4.2：67 行为 `transitionTo` 同状态早退防御 `return`，公开入口目标态与当前态恒不相等，**测试边界内不可达**。§4.3：257 行为 `SUPERVISOR_ROLE_MISSING` 守卫 `throw`；注册表工厂硬编码四角色，公开路径无法构造缺失 supervisor 的注册表，**防御性 fail-closed 语句，测试边界内不可达** |
| 4 | 安全 LLM | `src/core/agent/consult/llm/safeLlm.ts` | `tests/unit/consult-agent/safeLlm.test.ts`（7 / 24 / 2）；`tests/unit/consult-agent/disclaimer.test.ts`（6 / 11 / 1，离线文案免责口径辅助断言） | 85.71 | 100.00 | — | §4.5：Lines 已 100.00；Funcs 残余跟踪单元 reporter 不按函数名列示，**不为残余单元指派具体公开函数名**；残余对应内部回调 / 初始化单元计数差异，不构成未覆盖业务分支。statements / branches：本环境 reporter 未提供该维度 |
| 5 | 长期画像 | `src/core/agent/consult/memory/profileMemory.ts` | `tests/unit/consult-agent/memory.test.ts`（9 / 20 / 2，与短期记忆共用）；`tests/unit/consult-agent/profileMemoryBranches.test.ts`（5 / 13 / 2） | 100.00 | 100.00 | — | 127-132 药物不耐受事实抽取分支、135-137 `preferred_language` 分支已补测；基线 127-132 未覆盖行已清零 |
| 6 | 角色支撑 | `src/core/agent/consult/roleSupport.ts` | `tests/unit/consult-agent/roleSupport.test.ts`（3 / 9 / 2） | 100.00 | 100.00 | — | 31-36 `makeEvidence` 证据条目构造、41-53 `roleDisplayName` 全角色展示名映射已覆盖；基线 31-36、41-53 未覆盖行已清零 |
| 7 | DEMO 运行时 | `src/core/agent/consult/runtime/sessionRuntime.ts` | `tests/unit/consult-agent/sessionRuntime.test.ts`（8 / 26 / 5） | 92.11 | 100.00 | — | §4.5：Lines 已 100.00；Funcs 残余 reporter 不具名，不指派函数名；`isDemoMode` 环境判定、画像持久化、文档读写、checkpoint 读写、`clear` 全量清空均已直接调用覆盖 |
| 8 | Supervisor 分诊 | `src/core/agent/consult/supervisor.ts` | `tests/unit/consult-agent/supervisorBranch.test.ts`（8 / 14 / 2） | 100.00 | 100.00 | — | 41-43 `chronic_management` / `clarification_answer` 路由医师分支已补测；另覆盖 `document_upload` / `unknown` / `acute_emergency` / `exit` / 充分态症状主诉分支与 `isSufficientForDoctor` 阈值三态 |
| 9 | 仓储 | `src/db/repositories/consultAgentRepo.ts` | `tests/unit/consult-agent/consultAgentRepo.test.ts`（40 / 309 / 13，Postgres 13 方法 mock pool 契约）；`tests/unit/consult-agent/ddlSchema.test.ts`（20 / 54 / 6，380–385 DDL 静态对齐） | 94.00 | 99.05 | 98 | §4.4：98 行为 `DemoConsultRepo.listDocuments` 方法声明，99 行委托语句未列入未覆盖清单；mock pool 用例先置 `DEMO_MODE='0'` 返回 `PostgresConsultRepo`，DEMO 委托方法未被触达。**不属真实 PostgreSQL 查询分支缺口**；真实 DB 路径闭环状态见 §6 |
| 10 | 工具注册表 | `src/core/agent/consult/tools/toolRegistry.ts` | `tests/unit/consult-agent/toolRegistry.test.ts`（10 / 26 / 1）；`tests/unit/consult-agent/toolRegistryBranches.test.ts`（8 / 28 / 4） | 97.30 | 100.00 | — | §4.5：Lines 已 100.00；Funcs 残余 reporter 不具名，不指派函数名；`register` 同名覆盖、`resolve` 空白归一、未声明 `knownArgs` 保留全参、`invoke` 异常安全降级、五个内置工具空 query / 未命中 / 单药零药等分支已覆盖 |
| 11 | 意图分类 | `src/core/agent/consult/intentClassifier.ts` | `tests/unit/consult-agent/intentClassifier.test.ts`（11 / 22 / 1） | 100.00 | 98.59 | reporter 未列行号 | §4.6：116-117 行为「无关键词命中但处于 Examiner 追问上下文」兜底分支，现有用例未触达；该行号为源码静态核对指向，**reporter 未列出行号，不作为 reporter 实测行号引用**；缺口与基线同值，属遗留分支，不计入本轮新增缺口 |

## 3. 两轮均 100.00 / 100.00 覆盖清单（覆盖率报告 §3.2，20 个文件）

下列文件在基线与本轮两份日志中 `% Funcs`、`% Lines` 均为 `100.00`，未覆盖行号列为空。

| # | 源码 / 测试支撑文件（相对路径） | 对应测试文件（静态 `it` / `expect` / `describe`） | 备注 |
|---|---|---|---|
| 1 | `src/bff/permissions.ts` | `tests/security/consult-agent/permissions.test.ts`（24 / 58 / 5） | 三权限码常量与全码数组随路由门禁用例覆盖 |
| 2 | `src/bff/types.ts` | 跨 unit / security / integration 用例间接引用 | 响应信封、错误码类型，无独立测试文件 |
| 3 | `src/core/agent/consult/demo/demoSeed.ts` | `tests/unit/consult-agent/demoSeed.test.ts`（6 / 18 / 1） | 引导文案、角色指引、示例知识 / 药品事实、规则快照完整性 |
| 4 | `src/core/agent/consult/draftHash.ts` | `tests/unit/consult-agent/draftHash.test.ts`（6 / 6 / 1） | 稳定字段提取与 SHA-256 哈希 |
| 5 | `src/core/agent/consult/index.ts` | 跨用例经桶导出间接引用 | 模块聚合导出，无独立测试文件 |
| 6 | `src/core/agent/consult/memory/shortTermMemory.ts` | `tests/unit/consult-agent/memory.test.ts`（9 / 20 / 2） | 短期滑窗 `recentMessages`、`checkpoint` |
| 7 | `src/core/agent/consult/roles/doctorRole.ts` | `tests/unit/consult-agent/roles.test.ts`（7 / 45 / 4） | 诊断草稿三红线字段、证据聚合、记忆更新 |
| 8 | `src/core/agent/consult/roles/examinerRole.ts` | `tests/unit/consult-agent/roles.test.ts`（7 / 45 / 4） | 追问问题生成、`nextRole: null` |
| 9 | `src/core/agent/consult/roles/index.ts` | `tests/unit/consult-agent/roles.test.ts`（7 / 45 / 4） | 注册表装配与 `getRolePort` |
| 10 | `src/core/agent/consult/roles/internal.ts` | `tests/unit/consult-agent/roles.test.ts`（7 / 45 / 4） | `invokeToolWithAudit` 成功 / 失败审计、`dedupeEvidence` |
| 11 | `src/core/agent/consult/roles/pharmacistRole.ts` | `tests/unit/consult-agent/roles.test.ts`（7 / 45 / 4） | 用药草稿三红线字段、药品 / 过敏 / 相互作用证据聚合 |
| 12 | `src/core/agent/consult/roles/supervisorRole.ts` | `tests/unit/consult-agent/roles.test.ts`（7 / 45 / 4） | 分诊回复、`nextRole`、`degradedLlm` 上抛 |
| 13 | `src/core/agent/consult/safety/acuteVocabulary.ts` | `tests/unit/consult-agent/acuteVocabulary.test.ts`（6 / 12 / 1） | 词表命中与归一化 |
| 14 | `src/core/agent/consult/safety/safetyGate.ts` | `tests/unit/consult-agent/safetyGate.test.ts`（5 / 8 / 1） | acute / caution / normal 三档判定 |
| 15 | `src/core/agent/consult/sentinel/sentinelGateway.ts` | `tests/unit/consult-agent/sentinel.test.ts`（7 / 11 / 1） | 三红线驳回、缺证据驳回、急症驳回、重复哈希、approved 五态 |
| 16 | `src/core/agent/consult/stateMachine.ts` | `tests/unit/consult-agent/stateMachine.test.ts`（5 / 23 / 1） | 合法转移、非法转移抛错、终态判定 |
| 17 | `src/core/agent/consult/tools/evidenceExtractor.ts` | `tests/unit/consult-agent/toolRegistry.test.ts`、`roles.test.ts` 间接覆盖 | 工具名 → 证据类别映射、证据条目构造 |
| 18 | `src/core/agent/consult/types.ts` | `tests/unit/consult-agent/typesSchema.test.ts`（15 / 18 / 4）；`tests/unit/consult-agent/disclaimer.test.ts`（6 / 11 / 1，常量免责口径） | 入参 / 草稿 zod schema 红线字面量、`DISCLAIMER` / `ACUTE_GUIDANCE` 常量 |
| 19 | `tests/support/testEnv.ts` | 测试支撑夹具 | 为三目录用例提供进程内环境装配，不计业务分支 |
| 20 | `tests/unit/consult-agent/helpers.ts` | 测试夹具（静态 `it` / `expect` / `describe` = 0 / 0 / 0） | fake Ctx、断言辅助，非测试用例文件 |

## 4. 边界文件（不计入 consult 覆盖率债务，覆盖率报告 §5）

下列文件属另一路 B 类后端改动与共享基础设施，不在 consult 深化分片内；本轮数字变化如实记录，不归功于 consult 补测。

| 源码文件（相对路径） | 基线 `%Funcs` | 基线 `%Lines` | 本轮 `%Funcs` | 本轮 `%Lines` | 本轮未覆盖行 | ΔLines | 归属说明 |
|---|---|---|---|---|---|---|---|
| `src/bff/config/runtimeEnv.ts` | 0.00 | 20.00 | 0.00 | 20.00 | 17、22-23、31-35 | 0.00 | B 类后端 / 运行时环境配置，本轮无变化，不计入 consult 债务 |
| `src/bff/middleware/auth.ts` | 33.33 | 46.78 | 33.33 | 46.78 | 22-26、30-31、47-55、60、68-79、84-114、132-166、171-179、184-195、203-209 | 0.00 | 共享鉴权中间件，本轮无变化；consult 权限码由 `permissions.test.ts` 在路由层覆盖，**不代表本文件其余中间件分支已闭环** |
| `src/db/pool.ts` | 0.00 | 8.03 | 0.00 | 8.03 | 31-61、65-68、72-90、94-95、99-103、107-108、120-124、143-180、192-211 | 0.00 | 共享连接池，未连接真实 PostgreSQL；本轮无变化 |
| `src/db/repositories/helpers.ts` | 0.00 | 20.97 | 11.11 | 22.58 | 18-23、28-29、33、37、41、66-80、85-106 | +1.61 | 共享仓储辅助（QueryBuilder、`toJson`、`buildSafeSetClause`、`dynamicSelect`）；本轮 48 行 `toJson` 经 consult 仓储间接触达，其余动态 WHERE / 安全 SET / 动态 SELECT 分支仍未覆盖；**该 1.61pt 涨幅归属共享基础设施，不计入 consult 补测成果** |

> 另按任务边界标注：`src/security/encryption/FieldCipher.ts`、`src/bff/routes/health.ts`、`src/bff/routes/imaging.ts`、`src/bff/routes/twin3DInpatient.ts`、`web/src/router/index.tsx`、`src/bff/server.ts` 归属其他分片，不在 consult 覆盖率矩阵内统计。

## 5. 未覆盖行裁决明细（覆盖率报告 §4，摘要引用）

| 裁决编号 | 文件与行号 | 语义 | 裁决结论 |
|---|---|---|---|
| §4.1 | `consultAgentRoutes.ts` 150-154、160-161 | SSE `abort` 监听回调与 `ReadableStream` `cancel` 回调 | 现有 handler 层测试使用构造态 fake Request，无法模拟真实客户端中途断流或主动取消；需 HTTP 层真实连接事件或浏览器网络事件触发，**测试边界内不可达**，留待真实 SSE / HTTP 联调阶段补覆盖 |
| §4.2 | `consultOrchestrator.ts` 67 | `transitionTo` 同状态早退防御 `return` | 公开入口发起的状态迁移目标态与当前态恒不相等，不存在公开入参可触发「同状态调用」；**防御性早退语句，测试边界内不可达** |
| §4.3 | `consultOrchestrator.ts` 257 | `SUPERVISOR_ROLE_MISSING` 守卫 `throw` | 注册表工厂在 `roles/index.ts` 硬编码注册四角色，公开路径无法构造缺失 supervisor 的注册表；**防御性 fail-closed 语句，测试边界内不可达** |
| §4.4 | `consultAgentRepo.ts` 98 | `DemoConsultRepo.listDocuments` 方法声明（99 行委托未列入未覆盖） | mock pool 契约用例置 `DEMO_MODE='0'` 走 `PostgresConsultRepo`；DEMO 模式路由 / 集成 / 安全用例未调用 `listDocuments`，文档读写由 `sessionRuntime.test.ts` 直接在 `SessionRuntime` 上覆盖；**演示模式仓储委托方法未被触达，不属真实 SQL 分支缺口** |
| §4.5 | `safeLlm.ts`、`sessionRuntime.ts`、`toolRegistry.ts`（Lines 均 100.00） | Funcs 维度残余跟踪单元 | 公开具名函数 / 方法均已被直接或间接调用（逐函数清单见覆盖率报告 §4.5）；残余单元 reporter 不具名，**不指派具体函数名**；不构成未覆盖业务分支。statements / branches：本环境 reporter 未提供该维度 |
| §4.6 | `intentClassifier.ts` 116-117 | 「无关键词 + 追问上下文」兜底分支 | 现有追问上下文用例携带症状词走 `symptom_report` 分支，无关键词用例 history 为空；组合分支未触达。reporter 未列行号，116-117 为静态核对指向；**与基线持平，非本轮新增缺口** |

## 6. 环境缺口与未闭环测试（覆盖率报告 §6，如实成节）

1. **真实数据库未演练**：本机无运行中 PostgreSQL；迁移 `380`–`385` 六表（`consult.threads`、`consult.messages`、`consult.documents`、`consult.diagnosis_prescription_drafts`、`consult.audit_trail`、`consult.profile_memory`）的真实建表、真实连接与 SQL 执行未演练。`PostgresConsultRepo` 各方法当前仅以 mock pool 契约测试断言 SQL 片段、列清单、蛇形转驼峰映射、空结果分支与错误透传，**不代表真实库表连通或真实查询通过**；`src/db/pool.ts` 与共享 `helpers.ts` 的动态查询路径未纳入本轮闭环。
2. **在线 LLM 路径未演练**：环境内无 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` 凭证；`safeLlm` 仅覆盖离线确定性降级路径，在线模型请求、响应解析、超时与重试链路未演练。
3. **真实 SSE / HTTP 联调未演练**：未启动真实 HTTP 服务做端到端联调；客户端中途断流、断线重连、超时降级、token 计量与节流均未覆盖；§4.1 两条断流回调需在该阶段补覆盖。
4. **浏览器视觉走查未执行**：本轮覆盖率仅为后端进程内测试口径，不含前端页面渲染、交互走查与视觉回归结论。
5. **覆盖范围边界**：本轮覆盖率仅反映 `tests/unit/consult-agent`、`tests/security/consult-agent`、`tests/integration/consult-agent` 三目录在 DEMO 进程内仓储下的执行情况；前端 `web/` 与其他 B 类后端模块不在本分片口径内。
6. **基线遗留失败用例不计入本轮统计**（不在 consult 三目录内，本轮未修复、不计入本轮 pass / fail 与覆盖率口径）：
   - F1：`tests/unit/onlineConsult.test.ts` 日期硬编码导致 1 fail；
   - F2：`tests/unit/db/ddl.test.ts` check-sql 对历史 M 系列 SQL 误报 1 fail。

## 7. 追溯与纪律

- 覆盖率唯一数字来源：`reports/consult-deepen/coverage-round1.md`（§1 口径、§2 汇总、§3 文件级对照、§4 未覆盖行裁决、§5 边界文件、§6 环境约束、§7 结论）；基线档案 `reports/consult-deepen/baseline-round0.md` 仅用于背景对照，不作为本轮覆盖率数字来源。
- 门禁脚本：`scripts/consult-agent/gate.ps1`（§6 BUN_TEST → `gate-6-bun-test.log`、§7 COVERAGE → `gate-7-coverage.log`）；分段命令与日志名见 [12-runbook.md](./12-runbook.md) §5、§6。
- 本文不宣称 consult 范围全覆盖：不可达防御语句、环境未闭环项与遗留兜底分支需在后续真实环境联调与跨分片验收阶段逐项核销（覆盖率报告 §7）。

# consult-agent M86 架构决策记录（ADR）

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 本记录归档 consult-agent（AI 辅助问诊助手）M86 重建中已经落地的架构决策；条目编号自 `ADR-001` 起连续编号，状态统一为 `Accepted`。所有引用均给出仓库相对路径与行号区间，可与既有契约文档、源码逐行核对；与既有文档冲突时，以冻结契约 `reports/consult-rebuild/CONTRACT-m86.md` 为单一事实来源（见 [README.md](./README.md) §7）。

## 1. 记录说明

### 1.1 状态口径

| 状态 | 含义 |
|---|---|
| `Accepted` | 决策已在 M86 当前代码基线落地，源码引用可直接核对；后续如推翻该决策，须另起新 ADR 并注明替代关系 |
| `Superseded` | 已被后续 ADR 取代（本批文档暂未出现该状态） |
| `Deprecated` | 决策仍存在但不再建议新代码沿用（本批文档暂未出现该状态） |

### 1.2 证据标注约定

- 引用格式：`相对路径` + `起始行–结束行`；同一决策跨多个文件时分别列出。
- 核心包根目录：`src/core/agent/consult/`；BFF 路由：`src/bff/routes/consultAgentRoutes.ts`；前端服务层：`web/src/services/api/consultAgent.ts`；前端页面：`web/src/pages/consult-agent/ConsultAgentChatPage.tsx`。
- 边界文件（`src/bff/server.ts`、`src/bff/middleware/auth.ts`、`web/src/store/authStore.ts`、`web/src/router/index.tsx` 等）归其他分片，本记录仅在决策必须跨层引用处标注其行号，不在 consult 分片内修改。
- 医疗红线口径（草稿三字段、急症旁路、审计脱敏、免责声明常驻）不得弱化；逐条对应代码见 [03-contract.md](./03-contract.md) §1、§3 与 [01-requirements.md](./01-requirements.md) §4。

## 2. 决策条目

### ADR-001 DEMO_MODE 进程内仓储短路与生产仓储接口分离

- **状态**：Accepted
- **背景 Context**：M86 本机环境不连接真实 PostgreSQL（见 `reports/consult-deepen/coverage-round1.md` §6 环境硬约束），单元 / 集成测试需要进程内确定性状态；同时后续非 DEMO 模式必须按 `consult` schema 六表落库（迁移 `380`–`385`，见 [04-data-model.md](./04-data-model.md) §3）。两套存储必须共享同一领域端口，避免 BFF 与编排层感知存储差异。
- **决策 Decision**：定义核心端口 `ConsultAgentPort`；`DEMO_MODE=1/true` 时由工厂返回 `DemoConsultRepo`，内部委托模块级单例 `SessionRuntime`（进程内 Map 保存线程 / 消息 / 草稿 / 审计 / 画像 / 文档）；非 DEMO 时返回 `PostgresConsultRepo`，按六表写 postgres.js 查询。BFF 只持有端口实例，不区分具体实现。
- **备选方案 Alternatives**：
  1. 全程对接真实 PostgreSQL，测试用临时库 —— 放弃：本机环境不可闭环，测试不可重复、速度不可控。
  2. BFF 直接在 handler 内 `Map` 存状态 —— 放弃：状态散落在路由层，无法被编排层复用，也无法平滑替换为数据库实现。
- **正面后果 Consequences**：
  - 测试与演示环境零外部依赖，三目录测试均走进程内仓储（`tests/unit/consult-agent/`、`tests/security/consult-agent/`、`tests/integration/consult-agent/`）。
  - 生产落库路径通过同一 `ConsultAgentPort` 契约约束，替换实现不影响编排器与路由代码。
  - 端口 13 个读写方法被 `PostgresConsultRepo` 契约测试以 mock pool 逐方法校验（`tests/unit/consult-agent/consultAgentRepo.test.ts`）。
- **负面后果 Consequences**：
  - 进程内 Map 重启即丢失，DEMO 数据不可作为演示历史归档；非 DEMO 路径本机不执行，仅保证编译通过，真实库路径需在具备 PostgreSQL 的环境补测。
  - 模块级单例在多进程部署下不共享会话状态，生产部署须以非 DEMO 仓储为准。
- **证据引用**：
  - `src/db/repositories/consultAgentRepo.ts` 31–33（`isConsultDemoMode` 环境判定）、408–413（`createConsultAgentRepo` 工厂：409–410 DEMO 分支、412 Postgres 分支）、1–13（文件头注释：DEMO 进程内兜底与非 DEMO 六表说明）。
  - `src/core/agent/consult/runtime/sessionRuntime.ts` 27–29（`isDemoMode`）、41（`SessionRuntime implements ConsultAgentPort`）、182（`createDemoRuntime` 工厂）。
  - `src/bff/routes/consultAgentRoutes.ts` 45（模块级 `repo` 端口实例，BFF 不感知实现差异）。
  - 文档：[01-requirements.md](./01-requirements.md) §6、[04-data-model.md](./04-data-model.md) §7。

### ADR-002 无 LLM 凭证时确定性离线引导：不联网、不产生临床结论

- **状态**：Accepted
- **背景 Context**：当前实现不发起任何大模型网络请求；即使环境中存在 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY`，也不调用外部服务。医疗合规上，AI 文案必须明确标注为辅助参考，禁止在离线模板中给出确诊结论。
- **决策 Decision**：`SafeLlmPort` 提供 `isAvailable()` 与 `complete(prompt, role)`；`DeterministicSafeLlm.complete` 按角色返回确定性模板文案，`degraded` 恒为 `true`，文案带免责声明口径。凭证探测仅读取三个环境变量是否存在，不触网；`degraded=true` 随角色结果上抛，供前端与审计识别降级来源。
- **备选方案 Alternatives**：
  1. 无凭证时抛错阻断问诊 —— 放弃：会导致连基础分诊与追问引导都无法演示，违背 DEMO 可运行目标。
  2. 直接调用在线 LLM 并缓存 —— 放弃：本机无凭证、无网络闭环；在线模型输出不可控，绕过哨兵红线风险高。
- **正面后果 Consequences**：
  - 全流程确定性、可断言，单元测试可逐字核对角色文案（`tests/unit/consult-agent/safeLlm.test.ts`、`tests/unit/consult-agent/roles.test.ts`）。
  - 降级标识 `degraded=true` 贯穿角色输出，前端不把模板文案呈现为 AI 确诊结论。
  - 不产生外部数据回流，合规边界清晰。
- **负面后果 Consequences**：
  - 在线请求 / 响应解析 / 超时 / 重试路径本机未演练（`coverage-round1.md` §6），接入真实 LLM 时需补齐超时、重试、内容安全与凭证轮换设计。
  - 模板文案覆盖场景有限，复杂主诉仍需人工医师介入；这一限制在免责声明与页面提示中常驻告知。
- **证据引用**：
  - `src/core/agent/consult/llm/safeLlm.ts` 22（三个凭证环境变量键）、25–39（`roleTemplate` 四角色确定性文案）、43–45（`isAvailable` 凭证探测）、47–55（`complete` 离线补全，53 行 `degraded: true`）、59（`createSafeLlm` 工厂）、7（文件头：当前实现不发起网络请求）。
  - `src/bff/routes/consultAgentRoutes.ts` 77–91（`buildOrchestratorContext` 装配 `createSafeLlm()`，87 行）。
  - `web/src/pages/consult-agent/ConsultAgentChatPage.tsx` 83–84（页面级免责声明常量 `DISCLAIMER`）、87–88（急症引导常量 `ACUTE_GUIDANCE`）；每条 assistant 回复下方附免责声明（1110 行 `message.disclaimer || DISCLAIMER`）；免责声明常驻页面底部（1162 行注释、1173 行渲染 `DISCLAIMER`）；120 提示常驻（973 行急症提醒）。
  - 文档：[README.md](./README.md) §4 LLM 凭证口径、[01-requirements.md](./01-requirements.md) §5.5 确定性与可测试性。

### ADR-003 四角色注册表装配：supervisor / examiner / doctor / pharmacist

- **状态**：Accepted
- **背景 Context**：咨询链路包含编排分诊（Supervisor）、信息追问（Examiner）、诊断建议草稿（Doctor）、用药审方草稿（Pharmacist）四类角色，统一满足 `RolePort` 契约；编排器按 Supervisor 返回的 `nextRole` 动态分派，需要可替换、可测试的角色装配方式。
- **决策 Decision**：`RoleRegistry` 为 `Map<RoleKind, RolePort>`；`buildRoleRegistry(llm)` 在编排上下文内一次性装配四角色实例（共用同一 `SafeLlmPort`）；`getRolePort(registry, kind)` 取角色，未登记返回 `null`。编排器先执行 Supervisor，再按 `nextRole` 分派至多一个下游角色；Supervisor 缺失时显式抛 `SUPERVISOR_ROLE_MISSING`。
- **备选方案 Alternatives**：
  1. 编排器内 `switch` 直接 `new` 四个角色 —— 放弃：角色集合耦合在编排器分支中，替换 / 测试替身需要改编排器代码。
  2. 每个角色独立 HTTP 服务远程编排 —— 放弃：M86 范围内无分布式角色服务，进程内调用足以满足时延与可测试性要求。
- **正面后果 Consequences**：
  - 角色集合集中登记，新增 / 替换角色只需改注册表与 `RolePort` 实现。
  - 测试可注入替身 `RolePort` 驱动编排分支（`tests/unit/consult-agent/orchestrator.test.ts`、`orchestratorBranches.test.ts`）。
  - 角色职责边界清晰：Supervisor 不产草稿，Doctor / Pharmacist 才构造草稿（见 `doctorRole.ts`、`pharmacistRole.ts` 草稿块）。
- **负面后果 Consequences**：
  - 注册表硬编码四角色，动态角色扩展需修改注册表与 `RoleKind` 联合类型。
  - 单会话内只执行 Supervisor + 至多一个下游角色，复杂多轮角色协作链路不在本期范围。
- **证据引用**：
  - `src/core/agent/consult/roles/index.ts` 18（`RoleRegistry` 类型）、21–28（`buildRoleRegistry`：23 supervisor、24 examiner、25 doctor、26 pharmacist）、31–33（`getRolePort`）。
  - `src/core/agent/consult/consultOrchestrator.ts` 236（装配注册表）、255–257（Supervisor 缺失守卫抛 `SUPERVISOR_ROLE_MISSING`）、259（Supervisor 执行）、268–278（按 `nextRole` 分派下游角色）。
  - 角色实现：`roles/supervisorRole.ts` 35、`roles/examinerRole.ts` 49、`roles/doctorRole.ts` 47、`roles/pharmacistRole.ts` 68；工具调用公共入口 `roles/internal.ts` 40（`invokeToolWithAudit`）。
  - 文档：[02-architecture.md](./02-architecture.md) 角色分层说明、[01-requirements.md](./01-requirements.md) §2.1、§3.3。

### ADR-004 哨兵草稿审批闸三红线：复核标识 / 非院外处方 / pending_review

- **状态**：Accepted
- **背景 Context**：AI 生成的诊断、用药草稿必须经执业医师 / 药师复核，禁止 AI 自主开在院医嘱，禁止形成院外处方；草稿在落库前必须经过独立审批闸，而不是依赖角色实现自觉遵守字段口径。
- **决策 Decision**：草稿类型层用 zod 字面量把三条红线强制为 `true` / `false` / `'pending_review'`；哨兵 `approveDraft` 在角色草稿进入落库前二次校验：`needsPhysicianReview=true`、`isOutOfHospitalPrescription=false`、`status='pending_review'` 任一不符即 `rejected`；另校验证据非空、当前会话非急症状态、草稿业务哈希不与已批准草稿重复。驳回、重复、通过三态分别落 `sentinel_rejected` / `sentinel_duplicate` / `sentinel_approved` 审计。
- **备选方案 Alternatives**：
  1. 只靠 zod schema 在 BFF 入参层校验 —— 放弃：草稿由核心包内部构造，不经 BFF 入参，缺少独立审批闸与去重能力。
  2. 草稿直接落库，由前端标签提示待复核 —— 放弃：前端可绕过，合规责任不在服务端闭环。
- **正面后果 Consequences**：
  - 红线在类型、schema、哨兵三层重复强制，任一层漏配都会在编译 / 测试期暴露。
  - 驳回 / 重复 / 通过决策可审计、可追溯；重复草稿按稳定字段哈希去重，避免同一份建议重复落库。
  - 前端标签严格由服务端字段驱动，不允许本地改写红线口径：`needsPhysicianReview=true` 渲染「需执业医师复核」标签（`ConsultAgentChatPage.tsx` 254），`isOutOfHospitalPrescription=false` 渲染「非院外处方」标签（256），草稿正文标注「AI 辅助建议，待医师复核」（296）。
- **负面后果 Consequences**：
  - 三红线字面量使草稿对象在类型层面不可构造出“复核中可签发”的变体，后续若开放医师复核通过状态，需要单独设计复核工作流与状态迁移。
  - 哨兵为进程内内存 `approvedHashes`（会话级），跨请求 / 跨实例的全局去重不在本期范围。
- **证据引用**：
  - `src/core/agent/consult/sentinel/sentinelGateway.ts` 35（`approveDraft` 入口）、43–44（`needsPhysicianReview` 驳回）、46–47（`isOutOfHospitalPrescription` 驳回）、49–53（`status` 必须 `pending_review` 驳回）、57（缺证据驳回）、59–60（急症状态驳回）、63（重复哈希判定）、73–74（`approved` 通过结论）。
  - `src/core/agent/consult/types.ts` 126–145（`ConsultDraft` 接口：135 行 `needsPhysicianReview: true`、137 行 `isOutOfHospitalPrescription: false`、138 行 `status: DraftStatus`）、226–243（`draftSchema`：234 行 `z.literal(true)`、235 行 `z.literal(false)`、236 行 `z.literal('pending_review')`）。
  - 角色草稿构造：`roles/doctorRole.ts` 99–101、`roles/pharmacistRole.ts` 125–127。
  - 编排审批流：`consultOrchestrator.ts` 289（调用 `approveDraft`）、291–307（驳回分支）、308–323（重复分支）、325–338（通过分支）。
  - 草稿哈希：`draftHash.ts` 17–24（稳定字段定义）、59（`extractStableFields`）、85–89（SHA-256，89 行 `createHash('sha256')`）。
  - 文档：[01-requirements.md](./01-requirements.md) §4 医疗安全红线、[03-contract.md](./03-contract.md) §1.3 草稿 schema。

### ADR-005 审计仅留脱敏摘要，不回显原始入参

- **状态**：Accepted
- **背景 Context**：问诊内容、工具入参可能包含个人健康信息与用药细节；审计轨迹用于合规追溯，必须记录“谁在什么时间做了什么、结果如何”，但不得把用户原始输入明文、工具原始参数回显到审计条目。
- **决策 Decision**：`createAuditEntry` 落库前对 `detail` 统一经 `redactRawArgs` 递归脱敏，命中原始入参类键名的字段被剔除；`createToolCallRecord` 只保留调用方 ID、工具名、状态、耗时、证据数、错误分类、摘要字段，结构上不存在原始入参槽位。审计条目经 BFF `GET /threads/:threadId/audit` 按原字段回显，前端抽屉标题明示“仅脱敏摘要”。
- **备选方案 Alternatives**：
  1. 审计记录完整原始入参供事后复查 —— 放弃：违反最小必要原则，扩大健康敏感信息留存面。
  2. 工具调用只记成功 / 失败、不记证据数与摘要 —— 放弃：追溯性不足，无法复核工具结论与证据链。
- **正面后果 Consequences**：
  - 脱敏在构造期强制（`detail: redactRawArgs(...)`），新增审计调用点不会漏配。
  - 递归处理嵌套对象与数组（36–44 行），工具嵌套参数同样被过滤。
  - 审计字段集合固定，前端可按 `toolName` / `toolStatus` / `evidenceCount` / `summary` 渲染，不出现原始报文。
- **负面后果 Consequences**：
  - 脱敏规则以键名模式匹配，未来新增含敏感信息的键名须同步补充 `RAW_ARG_KEY_PATTERN` 清单。
  - 缺少原始入参意味着部分事后技术排障需要结合请求日志与 traceId 另行串联，审计表本身不承担调试转储职责。
- **证据引用**：
  - `src/core/agent/consult/audit/index.ts` 14（原始入参键名匹配模式）、18–33（`redactRawArgs` 主体）、36–44（嵌套对象 / 数组递归脱敏）、61–76（`createAuditEntry`：73 行 `detail: redactRawArgs(...)`）、79–97（`createToolCallRecord` 固定摘要字段）。
  - 编排内审计构造：`consultOrchestrator.ts` 148–153（`acute_bypass` 仅记命中词与等级）、292–298（`sentinel_rejected` 记哈希与原因）、311–317（`sentinel_duplicate`）、327–333（`sentinel_approved` 记哈希与草稿类型）；工具审计入口 `roles/internal.ts` 40–69（`invokeToolWithAudit`）。
  - BFF 审计端点：`src/bff/routes/consultAgentRoutes.ts` 334–349（`GET /threads/:threadId/audit`，346 行 `repo.listAudit`）。
  - 前端：`web/src/pages/consult-agent/ConsultAgentChatPage.tsx` 1211–1213（审计抽屉标题“仅脱敏摘要，不回显原始入参”）。
  - 文档：[README.md](./README.md) §5 第 4 条、[01-requirements.md](./01-requirements.md) §5.2 审计。

### ADR-006 SSE 事件契约：八类事件 + 结束帧 + 缓冲穿透响应头

- **状态**：Accepted
- **背景 Context**：流式问诊与历史回放都需要服务端逐帧推送、前端按 `type` 分派渲染；中间网关 / 代理不得缓冲整段响应；事件集合必须前后端与 OpenAPI 三处一致，避免字段漂移。
- **决策 Decision**：事件联合类型固定为八类：`delta` / `tool` / `safety:acute` / `draft` / `disclaimer` / `meta` / `done` / `error`；BFF `buildSseFrames` 把 `delta` 按 ~10 字切块、其余事件整帧编码，末尾追加结束帧 `data: [DONE]\n\n`；`SSE_HEADERS` 设置 `text/event-stream`、`no-cache, no-transform`、`keep-alive`、`X-Accel-Buffering: no`。`openSseStream` 以 80ms 打字机节奏 `ReadableStream` 推送，同时监听客户端 `abort` 与流 `cancel` 清理定时器。前端 `consumeSseStream` 按 `\n\n` 分帧，`handleFrame` 按 `type` 调对应 handler，`[DONE]` 帧直接返回。
- **备选方案 Alternatives**：
  1. 一次性返回完整结果，前端不做流式 —— 放弃：交互体验与既有医疗智能体流式范式不一致，长文案等待时间不可接受。
  2. 每类事件自定义 SSE `event:` 命名帧 —— 放弃：前端按 `data` JSON 的 `type` 分派更简单，与既有服务层消费范式一致。
- **正面后果 Consequences**：
  - 事件集合在核心类型、OpenAPI schema、前端类型定义三处逐一对齐（见 [13-contract-reconciliation.md](./13-contract-reconciliation.md) §3 对照表）。
  - 结束帧约定使前端可以区分“服务端正常收尾”与“连接中断”。
  - 响应头显式禁止缓冲，适配 Nginx 等中间层 `X-Accel-Buffering` 场景。
- **负面后果 Consequences**：
  - 中途断流、断线重连、超时降级、token 计量节流未在本机真实 SSE / HTTP 联调中演练（`coverage-round1.md` §6）；handler 层 `abort` / `cancel` 回调在 fake Request 下不可达（`coverage-round1.md` §4.1）。
  - 回放流的 `meta` 置信度固定为 `medium`、`done.messageId` 取最后一条持久化消息，与实时流的真实意图置信度口径不同（见 ADR-013）。
- **证据引用**：
  - 事件类型：`src/core/agent/consult/types.ts` 261–277（`SseEvent` 联合类型：262 `delta`、263–271 `tool`、272 `safety:acute`、273 `draft`、274 `disclaimer`、275 `meta`、276 `done`、277 `error`）。
  - BFF 帧装配：`src/bff/routes/consultAgentRoutes.ts` 48–53（`SSE_HEADERS`）、56（`STREAM_TICK_MS=80`）、59（`DELTA_CHUNK_SIZE=10`）、62–75（`chunkText`）、115–129（`buildSseFrames`，127 行结束帧 `data: [DONE]\n\n`）、132–166（`openSseStream`：150–158 abort 监听、160–163 `cancel` 回调）。
  - 编排事件发射：`consultOrchestrator.ts` 169–173（急症旁路三事件）、264–265（Supervisor `delta` / 工具事件）、302–306（驳回 `error`）、323 / 338（`draft`）、381（`disclaimer`）、382–386（`meta`）、387（`done`）。
  - 前端：`web/src/services/api/consultAgent.ts` 193–209（事件联合类型）、406–467（`handleFrame` 八类分派，413 行跳过 `[DONE]`）、473–533（`consumeSseStream`：479–480 token / CSRF、486–492 请求头、493 signal、520–524 分帧、526 尾缓冲、528 abort、531 释放锁）。
  - OpenAPI：`docs/api/consult-agent-openapi.yaml` 263–300（流端点）、301–328（回放端点）、724–797（八类事件 schema 与 `SseStream` 描述）。
  - 文档：[03-contract.md](./03-contract.md) §2 SSE 事件契约。

### ADR-007 三权限码拆分与角色映射：read / write / audit 分离

- **状态**：Accepted
- **背景 Context**：查看会话、执行问诊、查看审计属于三类不同敏感度操作；登录用户角色（admin / doctor / nurse）通过 JWT `permissions` 数组持有权限码，BFF 只校验权限码、不直接判断业务角色，便于权限随岗位调整而不改动路由。
- **决策 Decision**：登记 `consult-agent:read` / `consult-agent:write` / `consult-agent:audit` 三个码；映射口径：admin 三码全持，doctor 持 `read` + `write`，nurse 仅持 `read`，`audit` 码仅 admin 持有。BFF 每个 handler 首行调用 `requirePermissionCode` 做细粒度校验；未登录返回 401，admin 直通，显式权限码命中放行，其余 403。前端按同三码做条件渲染与回调二次判权（见 ADR-012）。
- **备选方案 Alternatives**：
  1. BFF 直接判断 `doctor` / `nurse` 角色名 —— 放弃：角色与权限耦合，岗位复合职责（如护士长、轮转医师）无法表达。
  2. 只分登录 / 未登录两档 —— 放弃：审计轨迹属于高敏感操作，必须独立成码。
- **正面后果 Consequences**：
  - 权限粒度与端点动作一一对应，安全测试可逐端点断言 401 / 403（`tests/security/consult-agent/permissions.test.ts`，24 个静态用例 / 58 条断言）。
  - 角色 → 权限码在登录签发侧维护，BFF 与前端共用同一组权限码常量。
  - `audit` 与 `read` 分离，普通医护即使可查看会话也不能查看审计轨迹。
- **负面后果 Consequences**：
  - 角色与码的映射由登录签发侧配置，本分片不校验 JWT 签发逻辑；映射错误需在身份认证分片排查。
  - 前端判权只是体验层拦截，服务端 `requirePermissionCode` 才是权威闸门（见 ADR-012 备选与后果说明）。
- **证据引用**：
  - `src/bff/permissions.ts` 198–206（注释：三码用途与医疗安全口径）、207–211（`CONSULT_AGENT_PERMISSIONS`：208 `read`、209 `write`、210 `audit`）、213–215（联合类型）、217–218（全码遍历数组）。
  - `src/bff/middleware/auth.ts` 314–326（`requirePermissionCode`：316 行 401、318 行 admin 直通、319 行显式码命中、321 行分组通配、324 行 403）。
  - 前端判权：`web/src/store/authStore.ts` 338–341（`hasPermission`：`*` 通配或显式码命中）。
  - 路由入口：`web/src/router/index.tsx` 8803–8811（`RequirePermission permission="consult-agent:read"`，8807 行；该路由文件归前端框架分片，此处仅引用）。
  - 文档：[README.md](./README.md) §6 权限码一览表、[03-contract.md](./03-contract.md) §3.3 权限登记。

### ADR-008 幂等键由全局中间件装配，流路由不消费 Idempotency-Key

- **状态**：Accepted
- **背景 Context**：创建会话、发送消息、语音转写、退出会话等状态变更请求在网络重试时可能重复执行；幂等校验、CSRF、登录鉴权、操作审计属于跨端点横切关注点，应由全局中间件统一装配，避免每个 handler 重复实现。流式端点天然不可按请求体重放（已在服务端完成编排并逐帧下发），不参与幂等校验。
- **决策 Decision**：`server.ts` 全局管道按序装配：CSRF 双提交校验 → 租户 / 院区上下文 → `requireAuth` → 错误处理包装 `withIdempotency(c, () => handler(c))` → 终态 `auditOperation`（POST / PUT / DELETE 留痕，fire-and-forget）。四个写端点（创建、发消息、转写、退出）接受 `Idempotency-Key`；`POST /threads/:threadId/stream` 与回放流不消费幂等键，OpenAPI 标注 `x-idempotent: false`，服务层也不传该头。审计操作在 `finally` 段落库，失败不影响主请求。
- **备选方案 Alternatives**：
  1. 每个 handler 内部自行读取幂等键并查重 —— 放弃：重复代码面大，易出现个别端点漏配。
  2. 流式端点也做幂等重放 —— 放弃：SSE 流已执行编排、推送工具事件与草稿，重复请求语义不一致；客户端取消后重试由前端走快照 `sendMessage` 兜底。
- **正面后果 Consequences**：
  - 状态变更端点的幂等 / 审计口径与既有 BFF 范式保持一致，新增写端点自动获得横切能力。
  - 流端点实现简洁，handler 内只关心事件编排与帧装配。
  - 审计 fire-and-forget 不阻断主请求成功返回。
- **负面后果 Consequences**：
  - 幂等键缓存 / 重放存储在全局中间件层，consult 分片无法单独观测其命中情况；该中间件归属共享基础设施分片。
  - 网络重试产生的重复幂等键冲突响应口径由全局中间件统一返回，本分片文档不重复定义错误体。
- **证据引用**：
  - `src/bff/server.ts` 6782–6785（`verifyCsrf`，403 响应）、6789–6792（租户上下文，403 响应）、6805–6808（`requireAuth`，401 响应）、6822–6823（`withIdempotency` 包裹 handler）、6838–6839（`auditOperation` fire-and-forget，POST / PUT / DELETE）、6840–6845（`recordHttpRequest`）。该文件归共享基础设施分片，此处仅引用装配顺序。
  - BFF 路由注释：`src/bff/routes/consultAgentRoutes.ts` 8–10（权限码 / 幂等 / 审计 / CSRF 由中间件装配，流路由不消费 `Idempotency-Key`）、377（stream 端点注释：不消费幂等键）。
  - OpenAPI：`docs/api/consult-agent-openapi.yaml` 82–83（创建会话幂等 / 审计）、134–135（发消息）、190–191（转写）、272–273（stream：`x-idempotent: false`、`x-audit: true`）、386–387（退出）、419–422（`IdempotencyKey` 参数定义，可选）。
  - 前端服务层：`web/src/services/api/consultAgent.ts` 536–548（`streamReply` 不传幂等键）；`web/src/services/request.ts` 164（`post` 统一发出状态变更请求）。
  - 文档：[03-contract.md](./03-contract.md) §3.1 响应封装与写操作三件套、[06-test-strategy.md](./06-test-strategy.md) §4 写操作三件套。

### ADR-009 状态机纯函数与非法转移显式抛错

- **状态**：Accepted
- **背景 Context**：会话状态（`idle` / `collecting` / `clarifying` / `drafting` / `review_pending` / `escalated` / `closed` / `aborted`）之间的合法转移必须集中定义，业务代码不得自由改写 `status`；非法转移应在服务端尽早失败，而不是产生不一致的会话状态。
- **决策 Decision**：状态机模块保持纯函数：`THREAD_TRANSITIONS` 表定义每个状态的合法后继；`canTransition(from, to)` 只读判断；`assertTransition(from, to)` 非法即抛 `非法状态转移: from -> to`；`isTerminalStatus` 判定 `closed` / `aborted`。编排器私有 `transitionTo` 先做同状态早退，再经 `assertTransition` 校验后写回状态。终态会话由编排器入口与退出端点双重拦截，抛 `THREAD_CLOSED` / 返回 409。
- **备选方案 Alternatives**：
  1. 各角色与 handler 直接 `thread.status = 'xxx'` —— 放弃：合法转移散落各处，无法集中审计与测试。
  2. 非法转移静默忽略 —— 放弃：掩盖逻辑错误，问题状态进入落库后难以恢复。
- **正面后果 Consequences**：
  - 合法转移集合单一事实来源，状态机单元测试覆盖全部合法 / 非法路径（`tests/unit/consult-agent/stateMachine.test.ts`，5 个静态用例 / 23 条断言）。
  - 非法转移在编排层立即抛出，映射为 409 结构化错误，不回显内部堆栈。
  - 同状态早退避免重复触发审计与状态更新（`consultOrchestrator.ts` 66–68）。
- **负面后果 Consequences**：
  - 编排器退出分支（185–232）与退出端点（`consultAgentRoutes.ts` 564–566）直接置 `closed`，依赖前置终态守卫而非状态机表逐项校验；后续扩展终态路径时应回收到 `assertTransition`。
  - 同状态早退防御分支在测试中不可达（`coverage-round1.md` §4.2，`consultOrchestrator.ts` 67 行），属于防御性代码。
- **证据引用**：
  - `src/core/agent/consult/stateMachine.ts` 13–21（`THREAD_TRANSITIONS` 转移表）、25–27（`canTransition`）、30–34（`assertTransition` 显式抛错）、37–39（`isTerminalStatus`：`closed` / `aborted`）。
  - `src/core/agent/consult/consultOrchestrator.ts` 65–77（私有 `transitionTo`：66–68 行同状态早退、74 行 `assertTransition`）、133–135（终态抛 `THREAD_CLOSED`）、185–186（退出意图转 `closed`）。
  - BFF 退出端点：`src/bff/routes/consultAgentRoutes.ts` 560–561（终态 409）、564–567（关闭状态落库）。
  - 文档：[05-state-machine.md](./05-state-machine.md) §2.1 允许转移矩阵（46–57 行）、§2.2 状态转移约束（59 行起）、§4 终态规则（80 行起）。

### ADR-010 画像记忆合并规则：事实键去重，updatedAt 新者胜

- **状态**：Accepted
- **背景 Context**：长期画像按事实键（如 `allergy` / `chronic_condition` / `drug_intolerance` / `preferred_language`）累积；多轮会话抽取到的事实可能重复或取值更新，合并必须稳定可预测，避免出现同一键多条事实覆盖工具检索结果。
- **决策 Decision**：`mergeFacts(existing, updates)` 以键为索引：既有事实先进入合并表；新事实按键命中则替换（同键只保留更新者，`updatedAt` 以新者为准），未命中则追加；`upsertFact` 在单条事实维度复用 `mergeFacts`。文本抽取 `extractFactsFromText` 按慢性病、药物不耐受、偏好语言等规则产出事实，带 `source` 与 `updatedAt`。编排器在落库前合并 `ctx.profile.facts` 与本轮 `memoryUpdates` 后保存画像。
- **备选方案 Alternatives**：
  1. 所有抽取事实无条件追加，工具检索时自行去重 —— 放弃：画像表无边界，旧取值与新取值并存导致证据冲突。
  2. 画像只写内存、不落库 —— 放弃：跨会话长期记忆是产品需求，DEMO 进程内保存，非 DEMO 落 `consult.profile_memory` 表。
- **正面后果 Consequences**：
  - 合并规则纯函数化，分支测试覆盖既有键命中、新键追加、时间戳胜负（`tests/unit/consult-agent/profileMemoryBranches.test.ts`、`memory.test.ts`）。
  - 事实结构统一带 `source`，审计与回溯可定位抽取来源。
- **负面后果 Consequences**：
  - 同键新值直接覆盖旧值，不保留历史取值轨迹；需要长期病史沿革时应在独立随访模块记录，而非覆盖画像事实。
  - 规则抽取基于关键词匹配，未命中的表述不会形成画像事实；复杂叙述需要医师面诊补充。
- **证据引用**：
  - `src/core/agent/consult/memory/profileMemory.ts` 39–59（`mergeFacts`：43–46 既有复制、48–52 新键追加 / 命中替换、53–54 `updatedAt` 新者胜）、62–67（`upsertFact`）、71–89（慢性病 / 药物不耐受关键词表）、97–140（`extractFactsFromText`）、136（`preferred_language` 事实）。
  - 编排合并：`consultOrchestrator.ts` 351（`mergeFacts(ctx.profile.facts, memoryUpdates)`）。
  - 角色记忆产出：`roles/doctorRole.ts` 111、`roles/pharmacistRole.ts` 137（`extractFactsFromText` 进入 `memoryUpdates`）。
  - 短期记忆：`memory/shortTermMemory.ts`（`recentMessages` 滑窗、`checkpoint` 检查点，由 `index.ts` 81 行导出）。
  - 文档：[01-requirements.md](./01-requirements.md) §3.7 记忆、[04-data-model.md](./04-data-model.md) §3.6 画像表。

### ADR-011 工具注册表白名单：内置五工具 + knownArgs 参数过滤

- **状态**：Accepted
- **背景 Context**：角色可调用的知识检索、用药查询、过敏核查、相互作用核查、病史回顾工具必须收敛在注册表内；工具参数来自消息文本抽取，不能把未声明参数原样传入工具实现，避免参数污染与越权读取。
- **决策 Decision**：`ToolRegistry` 持有描述符集合；`register` 同名覆盖旧条目；`resolve` 按规范名 / 别名解析；入参先做下划线 → 驼峰归一化，再按描述符 `knownArgs` 白名单过滤（未声明 `knownArgs` 时保留全部归一化参数）；`createDefaultToolRegistry` 装配五个内置工具：知识检索 `searchKnowledgeBase`、用药查询 `lookupDrug`、过敏核查 `checkAllergy`、相互作用核查 `checkInteraction`、病史回顾 `retrievePatientHistory`。工具产出经 `evidenceExtractor` 分类为证据条目并去重后进入草稿证据链。
- **备选方案 Alternatives**：
  1. 角色直接 `import` 工具函数调用 —— 放弃：无法集中做参数过滤、审计与注册表快照，规则快照也无法枚举可用工具。
  2. 开放任意参数透传 —— 放弃：工具实现无法控制参数形状，存在注入与误用面。
- **正面后果 Consequences**：
  - 工具集合可枚举，`GET /rules/snapshot` 向前端公布工具清单（名称 / 描述 / 别名）。
  - 白名单过滤在 `invoke` 层统一执行，新增工具只需声明 `knownArgs`。
  - 工具成功 / 失败、证据数、摘要进入审计记录（`roles/internal.ts` 40–69）。
- **负面后果 Consequences**：
  - 内置工具基于 DEMO 种子数据返回证据，非真实知识库 / 药品库；在线工具接入需另行设计权限与频率控制。
  - 未声明 `knownArgs` 的描述符保留全部归一化参数，新增此类描述符时需自行做参数校验。
- **证据引用**：
  - `src/core/agent/consult/tools/toolRegistry.ts` 29–36（`ToolDescriptor`，34 行 `knownArgs`）、184–185（`ToolRegistry` 类与描述符 Map）、188–190（`register`）、193–204（`resolve` 规范名 / 别名）、207–213（`normalizeArgs` 参数归一化）、216–230（`filterKnownArgs` 白名单）、236–261（`invoke` 调用链与异常安全降级）、264–269（`list` 快照）、274（`createDefaultToolRegistry`）、276 / 283 / 290 / 297 / 304（五个内置工具注册）。
  - 证据分类：`tools/evidenceExtractor.ts` 28（`classifyKind`）、39–43（`extractEvidence`）；证据去重 `roles/internal.ts` 73（`dedupeEvidence`）。
  - 编排装配：`consultOrchestrator.ts` 242（`tools: ctx.tools` 注入角色输入）；BFF 上下文 `consultAgentRoutes.ts` 88（`createDefaultToolRegistry()`）。
  - 文档：[01-requirements.md](./01-requirements.md) §3.4 工具调用、[03-contract.md](./03-contract.md) 工具清单说明。

### ADR-012 前端二次判权：无权限不渲染入口，回调内首行再判权

- **状态**：Accepted
- **背景 Context**：服务端权限码是权威闸门，但前端若对无权限用户渲染按钮、抽屉或直接发起服务调用，会产生无意义的 403 请求与误导性界面；同时不能把前端判权当作唯一安全边界。
- **决策 Decision**：页面从 `useAuthStore` 取 `hasPermission`，派生 `canRead` / `canWrite` / `canAudit`；查看类入口（规则快照、事件回放、用户画像）由 `canRead` 条件渲染，审计入口由 `canAudit` 条件渲染，语音转写按钮由 `canWrite` 条件渲染。回调内对需要写 / 审计 / 读权限的动作首行再次判权，无权限直接 `return`，不调用服务函数。新建会话、退出会话、发送消息三个动作不在回调内二次判权，由 BFF `WRITE` 权限码权威拦截；路由层以 `RequirePermission="consult-agent:read"` 做页面入口兜底。
- **备选方案 Alternatives**：
  1. 仅在路由层做权限码判断，页面内不再判权 —— 放弃：同页面内读 / 写 / 审计三码粒度不同，无法区分按钮显隐。
  2. 前端判权后不再请求服务端校验 —— 放弃：前端代码可被绕过，服务端 `requirePermissionCode` 必须保持权威。
- **正面后果 Consequences**：
  - 无权限用户看不到对应入口，界面状态与权限一致，减少 403 噪音请求。
  - 回调二次判权防止渲染条件被状态更新绕过（如权限中途变化）时仍发起调用。
  - 服务端拦截口径不因前端判权而放宽，安全模型分层清晰：前端体验层 + BFF 权威层。
- **负面后果 Consequences**：
  - 新建 / 退出 / 发送按钮未做条件渲染包裹（`handleCreate` 430–442、`handleExit` 626–638、`handleSend` 445–623 无回调内判权），低权限用户若通过浏览器调试触发，会收到 BFF 403；这是刻意依赖服务端权威拦截，不视为前端缺陷。
  - 权限状态缓存于前端 store，JWT 刷新后须重新同步 `permissions` 数组。
- **证据引用**：
  - 权限判定：`web/src/store/authStore.ts` 338–341（`hasPermission`）。
  - 页面派生：`web/src/pages/consult-agent/ConsultAgentChatPage.tsx` 322（`hasPermission` 取值）、323（`canWrite`）、324（`canAudit`）、325（`canRead`）。
  - 渲染门禁：825（规则快照 `canRead`）、837（事件回放 `canRead`）、849（用户画像 `canRead`）、861（审计轨迹 `canAudit`）、1123（语音转写 `canWrite`）。
  - 回调二次判权：642–643（`handleTranscribe` 首行 `if (!canWrite) return;`）、664–665（`handleOpenAudit` `canAudit`）、682–683（`handleOpenRules` `canRead`）、697–698（`handleOpenProfile` `canRead`）、712–713（`handleReplay` `canRead`）。
  - 无二次判权、由 BFF 拦截的动作：430–442（`handleCreate`）、626–638（`handleExit`）、445–623（`handleSend`）；发送按钮 1148–1159 仅以 `isTerminal` 禁用，发送输入框 1135–1146 终态禁用。
  - 路由兜底：`web/src/router/index.tsx` 8805–8809（`RequirePermission` 包裹页面，归前端框架分片）。
  - 文档：[03-contract.md](./03-contract.md) §4.2 前端页面契约。

### ADR-013 置信度标签与 messageId 回填：前端气泡与服务端记录对齐

- **状态**：Accepted
- **背景 Context**：流式过程中前端先挂空 assistant 气泡（本地临时 ID），服务端落库后才有真实 `messageId`；意图置信度随 `meta` 事件下发，前端需要把置信度标签绑定到最终落库消息上，避免回填后标签丢失或错挂到其他气泡。
- **决策 Decision**：编排器在 `disclaimer` 事件后下发 `meta`（`confidence` 由意图置信度经 `confidenceLevel` 分级为 `high` / `medium` / `low`，附 `disclaimer`），随后 `done` 事件携带服务端落库 `messageId`。前端 `onMeta` 把置信度记入以流式临时 ID 为键的映射；`onDone` 用真实 `messageId` 替换气泡 ID，并把置信度映射键一并迁移（临时键删除、新键建立）。回放流的 `meta` 置信度固定 `medium`，`done.messageId` 取最后一条持久化消息（空会话为空串）。服务层对非法 `confidence` 取值归一为 `low`，`messageId` 缺失回退空串。
- **备选方案 Alternatives**：
  1. 流式结束后整体重拉消息列表再渲染 —— 放弃：丢失打字机增量体验，回填期间界面抖动。
  2. 置信度只挂在本地临时气泡、回填后丢弃 —— 放弃：用户看不到服务端给出的证据强度提示，标签口径与消息记录脱节。
- **正面后果 Consequences**：
  - 气泡 ID 与服务端消息记录对齐，后续 `listMessages` 刷新、草稿挂载、审计串联均以真实 `messageId` 为准。
  - 置信度映射随 ID 迁移，回填后标签不丢失（568–575 行注释与实现）。
  - 服务层对异常取值做防御归一，不把非法标签渲染到界面。
- **负面后果 Consequences**：
  - 回放流 `meta` 固定 `medium`，不反映原始意图置信度；如需精确回放置信度，需把置信度持久化到消息记录。
  - `done` 事件 `messageId` 为空串时前端仅记录“无 messageId”提示，不做本地伪造 ID（744 行回放分支口径）。
- **证据引用**：
  - 置信度分级：`src/core/agent/consult/roleSupport.ts` 58–66（`confidenceLevel`：60 行 `high >= 0.85`、63 行 `medium >= 0.6`、66 行 `low`）。
  - 编排事件：`consultOrchestrator.ts` 381（`disclaimer`）、382–386（`meta` 事件，384 行 `confidenceLevel(intent.confidence)`）、387（`done` 携带 `message.id`）。
  - 回放固定口径：`src/bff/routes/consultAgentRoutes.ts` 502（`meta` 固定 `medium`）、503（`done.messageId` 取 `lastMessage?.id ?? ''`）。
  - 前端处理：`web/src/pages/consult-agent/ConsultAgentChatPage.tsx` 558–561（`onMeta` 写 `confidenceMap`）、562–575（`onDone`：563 取 `messageId`、565–567 气泡 ID 回填、569–575 置信度键迁移）、1091–1093（`ConfidenceTag` 仅对 assistant 气泡渲染）；回放 742（`onMeta` 展示置信度）、743–744（`onDone` 展示 `messageId`）。
  - 服务层防御：`web/src/services/api/consultAgent.ts` 449–457（`meta.confidence` 非 `high` / `medium` 归一 `low`）、458–460（`done.messageId` 回退空串）。
  - 文档：[03-contract.md](./03-contract.md) §2 事件字段说明、§4.2 页面状态契约。

### ADR-014 急症旁路优先于角色编排：不进角色、不产草稿、不调工具

- **状态**：Accepted
- **背景 Context**：急症信号（胸痛、呼吸困难、意识障碍等关键词命中）属于最高优先级安全场景；任何角色编排、工具检索、草稿生成都不应延迟急症引导，旁路路径必须独立于常规问诊链路并留痕。
- **决策 Decision**：消息进入编排后先执行 `evaluateSafety`；判定 `acute` 时直接转入 `escalated`，置 `intent='acute_emergency'`、`safetyLevel='acute'`、`currentRole=null`，记录 `acute_bypass` 审计，写入 `ACUTE_GUIDANCE` 引导消息，下发 `safety:acute` + `disclaimer` + `done` 三事件后返回；该路径不构造角色输入、不调用工具注册表、不产生草稿。意图分类器内急症识别短路在前，规则匹配在后。前端 `onAcute` 展示急症引导，页面常驻 120 提示。
- **备选方案 Alternatives**：
  1. 急症先经 Supervisor 分诊再决定是否旁路 —— 放弃：角色模板与工具调用增加旁路时延，且存在 Supervisor 误判为常规问诊的风险。
  2. 急症仅在前端提示、服务端照常编排 —— 放弃：服务端可能产出草稿或工具证据链，医疗合规口径不闭环。
- **正面后果 Consequences**：
  - 安全门在编排入口前置，常规链路任何分支都无法绕过急症判定（`consultOrchestrator.ts` 138 行先于 236 行角色装配执行）。
  - 旁路事件集合固定，测试可断言无 `draft` 事件、无工具事件（`tests/integration/consult-agent/consultFlow.test.ts` 急症旁路流程、`tests/unit/consult-agent/safetyGate.test.ts`、`acuteVocabulary.test.ts`）。
  - 旁路动作落 `acute_bypass` 审计，追溯性完整。
- **负面后果 Consequences**：
  - 关键词词表覆盖有限，漏判风险由 FMEA 持续跟踪（见 [10-fmea.md](./10-fmea.md) FMEA-02）；未命中急症词表的危重主诉会进入常规链路。
  - 旁路会话进入 `escalated` 终态语义，后续不可再发送常规消息；退出端点可将其关闭。
- **证据引用**：
  - 安全判定：`src/core/agent/consult/safety/safetyGate.ts` 40–57（`evaluateSafety`：41–43 acute、46–54 caution、57 normal）；`safety/acuteVocabulary.ts` 11（`ACUTE_KEYWORDS`）、70–81（`detectAcute` 归一化命中）。
  - 编排旁路：`consultOrchestrator.ts` 138（入口 `evaluateSafety`）、141–179（acute 旁路：142 转 `escalated`、143–146 状态字段、148–153 `acute_bypass` 审计、155–167 引导消息、169–173 三事件、175–177 落库、179 返回 `draft: null`）。
  - 意图短路：`intentClassifier.ts` 98–100（`detectAcute` 命中即 `acute_emergency`、置信度 0.98）。
  - 事件类型：`types.ts` 272（`safety:acute` 事件）、254–255（`ACUTE_GUIDANCE` 常量）。
  - 前端：`web/src/pages/consult-agent/ConsultAgentChatPage.tsx` 88（急症引导常量）、555（`onAcute` 挂急症状态）、973（常驻 120 急症提醒）。
  - 文档：[01-requirements.md](./01-requirements.md) §3.6 急症识别与旁路、§4 红线第 1 条、[05-state-machine.md](./05-state-machine.md) §3 急症旁路规则、[README.md](./README.md) §5 第 1 条。

## 3. 与其他文档的衔接

- 端点权限、幂等、审计、SSE 对照见 [09-permission-matrix.md](./09-permission-matrix.md)。
- 失效模式、降级措施与残余风险见 [10-fmea.md](./10-fmea.md)。
- 测试覆盖与未覆盖行裁决见 [11-test-coverage-matrix.md](./11-test-coverage-matrix.md)。
- 运行、门禁与排障见 [12-runbook.md](./12-runbook.md)。
- OpenAPI / BFF / 前端三端契约逐项复核见 [13-contract-reconciliation.md](./13-contract-reconciliation.md)。

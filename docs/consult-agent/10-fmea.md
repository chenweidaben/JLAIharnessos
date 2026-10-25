# consult-agent M86 故障模式与降级矩阵（FMEA）

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 本文覆盖 consult-agent 多角色问诊链路的失效模式、现有缓解措施与残余风险；缓解措施均对应真实源码路径（相对路径 + 行号区间）。测试数字与环境闭环口径以 `reports/consult-deepen/coverage-round1.md` 为唯一来源；本机环境不可闭环项如实写入残余风险列，不做“已覆盖”推定。

## 1. 评分口径

### 1.1 三个评分维度（1–10 分）

| 维度 | 含义 | 评分倾向 |
|---|---|---|
| 严重度 S（Severity） | 失效发生后对患者安全、合规、隐私与业务可用性的损害程度 | 10 = 直接医疗安全 / 合规事故；1 = 体验轻微抖动 |
| 发生度 O（Occurrence） | 当前实现与本机测试口径下该失效的出现概率 | 1 = 极罕见 / 已被强类型与前置校验压制；10 = 在线上环境高频出现 |
| 探测度 D（Detection） | 失效在到达用户前被测试、前置校验、日志或监控发现的难度（分高表示难发现） | 1 = 已有单测 / 集成测试稳定断言；10 = 本机环境不可达、无任何演练 |
| RPN | 风险优先数 = S × O × D | 数值越高越优先在上线前补测 / 加固 |

### 1.2 责任层定义

| 责任层 | 覆盖范围 |
|---|---|
| BFF | `src/bff/routes/consultAgentRoutes.ts`、`src/bff/permissions.ts`、`src/bff/middleware/auth.ts` |
| 编排层 | `src/core/agent/consult/` 内编排器、角色、记忆、意图分类、会话运行时 |
| 安全闸 | 安全门、急症词表、哨兵审批、工具注册表、审计脱敏 |
| 前端 | `web/src/services/api/consultAgent.ts`、`web/src/pages/consult-agent/ConsultAgentChatPage.tsx`、`web/src/services/request.ts` |
| 配置 / 基础设施 | 环境变量、全局中间件、仓储与连接池、身份签发（归其他分片，本文仅标注接口边界） |

### 1.3 评分使用说明

- O 分反映 **M86 当前本机 DEMO 基线**；接入在线 LLM、真实 PostgreSQL、真实 SSE 联调后须重评在线场景的 O 与 D。
- D 分凡涉及“fake Request 不可达”“无真实库”“无真实网络”的，按 `coverage-round1.md` §4 裁决与 §6 环境约束如实给高分。
- 本表不替代上线前临床安全评审；医疗红线相关失效（FMEA-02、FMEA-04、FMEA-05、FMEA-12）即使 RPN 较低，也不允许在未完成闭环补测前上线开放给真实患者使用。

## 2. FMEA 矩阵

| 编号 | 失效模式 | 触发条件 | 业务影响 | S | O | D | RPN | 现有缓解 / 降级措施（代码路径） | 残余风险 | 责任层 |
|---|---|---|---|---|---|---|---|---|---|---|
| FMEA-01 | LLM 不可用或超时 | 接入在线凭证后上游超时、5xx、凭证失效；当前实现不联网，`degraded` 恒为 `true` | 回复缺失或长时间等待；若离线模板被误认为确诊结论，存在合规风险 | 8 | 4 | 6 | 192 | `llm/safeLlm.ts` 14–18（`SafeLlmPort` 契约）、22（凭证键探测）、43–45（`isAvailable`）、47–55（`complete` 离线补全，53 行 `degraded: true`）；角色结果携带 `degradedLlm` 上抛：`roles/supervisorRole.ts` 59、71，`roles/examinerRole.ts` 70，`roles/doctorRole.ts` 121，`roles/pharmacistRole.ts` 148；免责声明常驻：`ConsultAgentChatPage.tsx` 83–84（`DISCLAIMER` 常量）、1110（每条回复下方）、1173（页面底部常驻） | 在线请求 / 响应解析 / 超时 / 重试未演练（`coverage-round1.md` §6）；未配置超时阈值、重试次数与熔断；本机无 LLM 凭证闭环，`isAvailable` 在线分支未执行 | 编排层 / 配置 |
| FMEA-02 | 急症关键词漏判 | 口语化表述、同义词、错字未命中 `ACUTE_KEYWORDS`；词表未覆盖新急症场景 | 危重主诉进入常规问诊，延误急诊引导（最高优先级安全风险） | 10 | 4 | 7 | 280 | `safety/acuteVocabulary.ts` 11（词表）、70–81（`detectAcute` 归一化命中）；`safety/safetyGate.ts` 40–57（`evaluateSafety`：41–43 acute、46–54 caution、57 normal）；`consultOrchestrator.ts` 138（入口先判安全）、141–179（acute 旁路：142 转 `escalated`、148–153 `acute_bypass` 审计、155–167 引导消息、169–173 三事件、175–177 落库）；前端 `ConsultAgentChatPage.tsx` 973（常驻 120 提醒）、555（`onAcute` 展示引导）；单测 `tests/unit/consult-agent/acuteVocabulary.test.ts`（6 用例 / 12 断言）、`safetyGate.test.ts`（5 用例 / 8 断言） | 词表覆盖度未经真实临床语料评审；无语义模型二次确认兜底；未命中词表的危重主诉会进入常规链路；在线急症识别未接入 | 安全闸 / 编排层 |
| FMEA-03 | 入参 schema 非法 | `content` 为空或超 4000 字、`title` 超 120 字、`patientId` 非 UUID、`transcript` / `audioText` 全空、`kind` 非 diagnosis / prescription | 脏数据入库或 handler 抛 500；接口被灌入畸形报文 | 5 | 3 | 2 | 30 | `types.ts` 194–197（`threadCreateSchema`）、201–203（`messageSendSchema`）、206–218（`transcribeSchema` 至少其一非空）、226–243（`draftSchema`）；BFF 前置 `safeParse`：`consultAgentRoutes.ts` 183–185、256–261、320–325、386–391、518–523，失败一律 400；`tests/unit/consult-agent/typesSchema.test.ts`（15 用例 / 18 断言）覆盖字面量与边界 | 超长报文在网络层无前置长度预检；zod 校验明细不回显前端，仅返回通用「入参非法」文案；未知字段在 zod 对象默认静默剥离 | BFF |
| FMEA-04 | 草稿红线被绕过 | 角色构造草稿字段不符；绕过 BFF 入参直接调用仓储落草稿；schema 字面量被改 | AI 草稿被当作可签发处方或院外处方，构成合规事故 | 10 | 2 | 2 | 40 | 类型层：`types.ts` 135（`needsPhysicianReview: true`）、137（`isOutOfHospitalPrescription: false`）、138（`status`）；schema 层：234–236 三行 `z.literal(...)` 强校验；审批闸：`sentinel/sentinelGateway.ts` 43–44（复核标识驳回）、46–47（院外处方驳回）、49–53（状态必须 `pending_review` 驳回）；编排流：`consultOrchestrator.ts` 289 调用 `approveDraft`、291–307 驳回分支落 `sentinel_rejected` 审计并下发 `error` 事件；`tests/unit/consult-agent/sentinel.test.ts`（7 用例 / 11 断言）；前端标签由服务端字段驱动：254 行「需执业医师复核」、256 行「非院外处方」、296 行「AI 辅助建议，待医师复核」（`ConsultAgentChatPage.tsx` 254、256、296） | 直接数据库写入可绕过应用层校验；非 DEMO 仓储的行级约束（CHECK / 枚举）需在真实 PostgreSQL 环境补测；复核通过后的状态流转不在本期范围（ADR-004 残余） | 安全闸 / 编排层 / BFF |
| FMEA-05 | 审计条目泄漏原始入参 | 新增 `detail` 键名未被脱敏模式覆盖；嵌套对象 / 数组漏脱敏；工具记录被塞入原始参数 | 健康敏感信息明文进入审计表，违反最小必要留存原则 | 9 | 3 | 3 | 81 | `audit/index.ts` 14（原始入参键名匹配模式）、18–33（`redactRawArgs` 主体）、36–44（嵌套对象 / 数组递归脱敏）、61–76（`createAuditEntry`，73 行落库前 `redactRawArgs`）、79–97（`createToolCallRecord` 仅保留调用方 ID / 工具名 / 状态 / 耗时 / 证据数 / 错误分类 / 摘要，无原始入参槽位）；`tests/unit/consult-agent/audit.test.ts`（7 用例 / 44 断言）覆盖嵌套对象与数组分支；前端抽屉标题 `ConsultAgentChatPage.tsx` 1213 明示「仅脱敏摘要，不回显原始入参」 | 键名模式清单须随新审计动作同步维护；脱敏不做正文内容识别（如正文中嵌入的证件号）；非 DEMO 审计表的列级存储加密归基础设施分片 | 编排层 / 安全闸 |
| FMEA-06 | 权限越权（401 / 403） | 未登录访问；已登录角色缺对应权限码；绕过前端渲染直接发起服务调用 | 越权查看会话、发起写操作或查看他人审计轨迹 | 8 | 2 | 2 | 32 | 登录闸：`src/bff/server.ts` 6805–6808（`requireAuth`，401）；权限闸：`src/bff/middleware/auth.ts` 314–326（316 行 401、318 行 admin 直通、319 行显式码命中、324 行 403）；12 个 handler 首行 `requirePermissionCode`（`consultAgentRoutes.ts` 179、239、252、296、313、340、357、382、417、515、540、553）；`tests/security/consult-agent/permissions.test.ts`（24 用例 / 58 断言）逐端点断言 401 / 403；前端二次判权见 `ConsultAgentChatPage.tsx` 643、665、683、698、713；路由兜底 `web/src/router/index.tsx` 8807 | JWT 签发侧角色 → 权限码映射错误不在本分片测试范围；前端 store 权限状态过期未刷新由全局登录态管理负责；`*` 通配语义与分组码通配（`auth.ts` 321）的边界归身份认证分片 | BFF / 前端 / 基础设施 |
| FMEA-07 | SSE 断流或客户端 cancel | 网络中断、页面关闭 / 路由切换、用户主动取消、中间层缓冲超时 | 回复半截、空气泡残留、前端消息状态与服务端不一致 | 6 | 5 | 6 | 180 | 服务端：`consultAgentRoutes.ts` 132–166（`openSseStream`：150–158 abort 监听清定时器并关闭控制器、160–163 `cancel` 回调清定时器）；前端：`web/src/services/api/consultAgent.ts` 473–533（479–480 取 token / CSRF、486–492 注入头、493 `signal`、496 abort 静默返回、520–524 按 `\n\n` 分帧、526 尾缓冲、528 abort 捕获、531 释放锁）；页面：`ConsultAgentChatPage.tsx` 516–517（`AbortController`）、590–606（`streamFailed` 后撤空气泡、回退一次性快照 `sendMessage`，不本地编造回复） | 中途断流、断线重连、超时降级、token 计量节流未覆盖（`coverage-round1.md` §6）；150–154 abort 回调、160–161 cancel 回调在 handler 层 fake Request 下不可达（`coverage-round1.md` §4.1）；无断点续传语义；未做真实浏览器 SSE 联调 | BFF / 前端 / 编排层 |
| FMEA-08 | 数据库不可用（非 DEMO 路径） | PostgreSQL 宕机、连接池耗尽、380–385 六表缺失或迁移未执行 | 非 DEMO 模式全部读写失败；演示与生产数据无法持久化 | 8 | 2 | 7 | 112 | 工厂分流：`src/db/repositories/consultAgentRepo.ts` 31–33（`isConsultDemoMode`）、408–413（DEMO 返回 `DemoConsultRepo`、非 DEMO 返回 `PostgresConsultRepo`）；非 DEMO SQL 参数化：393–400（`saveDocument` 段示例）；`tests/unit/consult-agent/consultAgentRepo.test.ts`（40 用例 / 309 断言）以 mock pool 契约校验 13 个方法；`ddlSchema.test.ts`（20 用例 / 54 断言）静态对齐六表 DDL 与仓储方法 | 本机无运行中 PostgreSQL，六表未真实建表 / 查询演练（`coverage-round1.md` §6）；连接池参数、事务边界、重试、慢查询监控不在本期；`src/db/pool.ts` 归共享基础设施分片，本文不评估其内部可靠性 | BFF / 配置 / 基础设施 |
| FMEA-09 | 幂等键重放 | 网络重试携带相同 `Idempotency-Key`；客户端重复提交创建会话、发消息、转写、退出 | 重复线程、重复消息、重复草稿；审计条目重复 | 5 | 3 | 4 | 60 | 全局装配：`src/bff/server.ts` 6822–6823（`withIdempotency` 包裹 handler，归属共享基础设施分片）；OpenAPI 标注幂等端点：`docs/api/consult-agent-openapi.yaml` 82（创建）、134（发消息）、190（转写）、386（退出）；前端 `web/src/services/request.ts` 130–136 仅 GET 参与自动重试，POST 不自动重试；流端点刻意不消费幂等键（`consultAgentRoutes.ts` 377 注释；OpenAPI 272 `x-idempotent: false`） | 幂等键存储、命中响应与冲突码口径由全局中间件与基础设施分片负责，consult 分片无法单独观测命中情况；本分片未做键级集成测试；相同键但不同请求体的冲突策略不在本期定义 | 基础设施 / BFF |
| FMEA-10 | 线程不存在（404） | `threadId` 拼错、线程已清理、前端缓存 ID 过期 | 列表 / 消息 / 草稿请求返回 404；错误处理不当会泄露线程存在性 | 4 | 4 | 2 | 32 | 归属前置：`consultAgentRoutes.ts` 106–112（`findOwnedThread` 统一 404，不区分“不存在”与“无权限”）；编排器：`consultOrchestrator.ts` 129–131（`THREAD_NOT_FOUND`）；错误映射：`consultAgentRoutes.ts` 96–97（404「咨询会话不存在」）；`tests/integration/consult-agent/consultRouteErrors.test.ts`（30 用例 / 192 断言）覆盖 404 分支 | 前端 404 后除会话列表刷新外无专门兜底引导；已清理线程的历史消息不可恢复；错误明细不含内部堆栈（口径见 `consultAgentRoutes.ts` 102） | BFF / 编排层 |
| FMEA-11 | 终态误操作（409） | 对 `closed` / `aborted` 会话发消息、转写、退出；多标签页状态未同步 | 操作被拒；重复退出可能产生重复审计条目 | 4 | 3 | 2 | 24 | 编排入口守卫：`consultOrchestrator.ts` 133–135（`isTerminalStatus` 判定，抛 `THREAD_CLOSED`）；退出端点前置守卫：`consultAgentRoutes.ts` 560–561（终态 409）；错误映射：`consultAgentRoutes.ts` 99–100（409）；状态机：`stateMachine.ts` 37–39（`isTerminalStatus`：`closed` / `aborted`）；前端禁用：`ConsultAgentChatPage.tsx` 817（退出按钮终态 `disabled`）、1128（转写按钮）、1146（输入框）、1153（发送按钮） | 多标签页 / 多设备终态状态不同步；终态会话草稿与审计只读口径需在真实库验证；退出端点直接置 `closed`，未逐项走状态机表（ADR-009 已知残余） | BFF / 编排层 / 前端 |
| FMEA-12 | 跨用户归属访问 | 篡改 `threadId` 读取他人会话消息、草稿、审计、画像 | 越权读取他人问诊记录，构成隐私事故 | 9 | 2 | 2 | 36 | 线程查询带用户标识：`consultAgentRoutes.ts` 107（`findOwnedThread` → `repo.findThread(threadId, c.user?.id ?? '')`）；编排器同口径：`consultOrchestrator.ts` 129（`findThread(threadId, ctx.userId)`）；列表按用户过滤：`consultAgentRoutes.ts` 241（`repo.listThreads(c.user?.id ?? '')`）；`consultRouteErrors.test.ts` 覆盖归属隔离分支 | 非 DEMO SQL 的 `WHERE user_id` 条件需在真实 PostgreSQL 断言；多租户 / 院区上下文由 `src/bff/server.ts` 6789–6792 全局中间件负责（归属其他分片）；画像事实按当前 `c.user?.id` 读取，不接受请求体传入用户标识 | BFF / 编排层 / 基础设施 |
| FMEA-13 | 工具调用异常 | 工具实现抛错、调用未注册工具名、参数缺失、知识库 / 药品库为空 | 角色回复缺证据；异常未捕获导致请求 500；工具错误被静默吞掉 | 6 | 4 | 3 | 72 | 注册表解析：`tools/toolRegistry.ts` 188–190（`register`）、193–204（`resolve` 规范名 / 别名）、236–261（`invoke` 链与异常安全降级）；调用包装：`roles/internal.ts` 40–69（`invokeToolWithAudit` 分别构造成功 / 失败审计，56、65 行记录 `evidenceCount`，带 `errorClass` 与 `summary`）；参数白名单：`toolRegistry.ts` 216–230（`filterKnownArgs`）；单测 `toolRegistry.test.ts`（10 用例 / 26 断言）、`toolRegistryBranches.test.ts`（8 用例 / 28 断言）；证据去重 `internal.ts` 73（`dedupeEvidence`） | 在线工具超时、并发限流、熔断未设计；工具返回非结构化证据时仅靠 `tools/evidenceExtractor.ts` 28、39–43 分类兜底；DEMO 种子为空时工具结论为空（FMEA-18） | 编排层 / 安全闸 |
| FMEA-14 | 证据缺失 | 知识 / 用药 / 过敏 / 病史工具均未检索到证据，角色仍尝试生成草稿 | 无证据草稿被放行风险；当前由哨兵驳回，用户收到「草稿未通过安全校验」提示 | 7 | 4 | 2 | 56 | 哨兵证据闸：`sentinelGateway.ts` 57（缺证据驳回「缺少证据支撑，不予审批」）；角色证据聚合：`roles/doctorRole.ts` 81–87（历史 / 过敏 / 知识合并）、`roles/pharmacistRole.ts` 105–108（药品 / 过敏 / 相互作用合并）；编排驳回：`consultOrchestrator.ts` 291–307（驳回落 `sentinel_rejected` 审计、下发 `error: DRAFT_REJECTED`、`draft = null`）；`tests/unit/consult-agent/orchestratorBranches.test.ts`（3 用例 / 33 断言）覆盖驳回分支 | 驳回后的追问引导文案较固定；在线知识库 / 药品库接入后的证据质量未评估；证据为空与证据不足（部分命中）在当前口径下均走哨兵驳回 | 安全闸 / 编排层 |
| FMEA-15 | 画像记忆冲突 | 同键新事实与旧事实取值矛盾；抽取规则误判；多会话并发写入 | 错误画像（错误过敏史 / 慢性病）被后续过敏核查、病史回顾工具引用 | 7 | 4 | 4 | 112 | 合并规则：`memory/profileMemory.ts` 39–59（`mergeFacts`：43–46 既有事实复制、48–52 命中替换 / 新键追加、53–54 `updatedAt` 新者胜）；62–67（`upsertFact`）；抽取：97（`extractFactsFromText`）、71–89 关键词表；编排合并落库：`consultOrchestrator.ts` 351（`mergeFacts(ctx.profile.facts, memoryUpdates)`）；单测 `memory.test.ts`（9 用例 / 20 断言）、`profileMemoryBranches.test.ts`（5 用例 / 13 断言） | 同键矛盾不保留历史取值、无人工复核入口；并发写在进程内单例下以最后写入为准，非 DEMO 库并发语义未演练；规则抽取基于关键词，复杂叙述不会形成事实 | 编排层 / 配置 |
| FMEA-16 | 置信度字段缺失或非法取值 | `meta` 事件缺 `confidence`；传入非法字符串；`done` 缺 `messageId`；回放末条消息为空 | 标签错挂到气泡；消息 ID 未回填，后续刷新导致气泡错配 | 4 | 3 | 3 | 36 | 前端归一：`web/src/services/api/consultAgent.ts` 449–457（`confidence` 非 `high` / `medium` 归一 `low`）、459（`messageId` 回退空串）；ID 回填与置信度键迁移：`ConsultAgentChatPage.tsx` 558–561（`onMeta` 写 `confidenceMap`）、562–575（`onDone` 回填真实 `messageId` 并迁移置信度映射）；服务端构造：`consultOrchestrator.ts` 382–386（`meta`，384 行 `confidenceLevel(intent.confidence)`）、387（`done` 携带落库 `messageId`）；回放兜底：`consultAgentRoutes.ts` 502（固定 `medium`）、503（`lastMessage?.id ?? ''`）；分级阈值 `roleSupport.ts` 58–66（`high ≥ 0.85`、`medium ≥ 0.6`、其余 `low`） | 回放 `meta` 置信度非原始意图置信度（ADR-013 已知口径）；0.85 / 0.6 阈值未经临床评审；`messageId` 为空串时回放仅记录「无 messageId」提示，不伪造本地 ID | 编排层 / 前端 |
| FMEA-17 | 回放漂移 | 时间线排序键相同；草稿 / 审计 `createdAt` 精度不足；持久化集合与在线事件集合不一致 | 回放顺序与真实交互错位；事件重复、缺失或乱序展示 | 5 | 3 | 5 | 75 | 时间线装配：`consultAgentRoutes.ts` 424–429（`Promise.all` 拉取消息 / 诊断草稿 / 处方草稿 / 审计）、441–460（合并后按 `createdAt` `localeCompare` 并列时按 `index` 兜底排序）、462–499（消息 `tool` / `delta` / `disclaimer`、草稿 `draft`、审计 `tool` 回放事件）；分帧：`consultAgent.ts` 520–524、526 尾缓冲；页面日志：`ConsultAgentChatPage.tsx` 721–725（逐条 `pushEvent`）、733–745 分派展示 | 未做回放流与在线流逐事件一致性比对；毫秒级时间戳并列时仅按内存 `index` 兜底，跨表排序口径需在真实库验证；回放不重放 `safety:acute` 之外的急症旁路原始事件细节 | BFF / 前端 |
| FMEA-18 | DEMO 种子缺失 | 种子常量被删除；规则快照字段缺失；示例知识 / 药品事实为空 | 演示环境空文案、工具检索空结果、规则抽屉空白 | 4 | 2 | 2 | 16 | 种子常量：`demo/demoSeed.ts` 15（`DEMO_GREETING`）、19（`ROLE_GUIDANCE`）、27（`SAMPLE_KNOWLEDGE`）、55（`SAMPLE_DRUG_FACTS`）、72–78（`RulesSnapshot` 类型）、82（`CONSULT_PERMISSIONS`）、89（`BUILTIN_TOOL_META`）、118–125（`buildRulesSnapshot`）；规则快照端点直取种子：`consultAgentRoutes.ts` 359–371；单测 `demoSeed.test.ts`（6 用例 / 18 断言）做完整性断言 | 种子内容为演示语料，不构成临床知识库；非 DEMO 环境不加载该种子；种子文案更新未纳入临床审核流程 | 配置 / 编排层 |
| FMEA-19 | CSRF / 凭据异常 | 缺少或失效 CSRF token；Bearer token 过期；双重提交 Cookie 不一致 | 状态变更被 403 拒绝；SSE 建连失败；用户被迫重新登录 | 6 | 3 | 3 | 54 | 服务端 CSRF：`src/bff/server.ts` 6782–6785（`verifyCsrf`，403；归属共享基础设施分片）；前端统一注入：`web/src/services/request.ts` 79–81（`Authorization: Bearer`）、85–87（`X-CSRF-Token`）；SSE 同口径：`consultAgent.ts` 479–480 取 token / CSRF、486–492 注入请求头；401 清理：`request.ts` 105、124 清除 token；重试范围：`request.ts` 130–136 仅限 GET 且可重试状态 | CSRF token 刷新与 token 静默续期归基础设施分片；SSE 长连接上 token 过期后的重连未设计（断线重连见 FMEA-07 残余）；本机未做真实 Cookie / 域名联调 | 基础设施 / 前端 / BFF |
| FMEA-20 | 状态机非法转移 | 代码路径直接改写 `status`；退出端点与编排器状态写入口径不一致；异常重试导致重复转移 | 会话进入不可预测状态；终态判断失效，常规消息被误拒或被误放行 | 6 | 2 | 2 | 24 | 转移表与断言：`stateMachine.ts` 13–21（`THREAD_TRANSITIONS`）、25–27（`canTransition`）、30–34（`assertTransition` 非法显式抛错）；编排私有转移：`consultOrchestrator.ts` 65–77（`transitionTo`：66–68 行同状态早退、74 行 `assertTransition`）；单测 `stateMachine.test.ts`（5 用例 / 23 断言）；未归类异常映射 500 且不回显堆栈：`consultAgentRoutes.ts` 102 | 退出端点 `consultAgentRoutes.ts` 564–566 直接置 `closed`，依赖前置终态守卫而非状态机表逐项校验（ADR-009 已知残余）；`consultOrchestrator.ts` 67 同状态早退防御分支测试不可达（`coverage-round1.md` §4.2） | 编排层 / BFF |
| FMEA-21 | 草稿重复落库 | 相同主诉重复生成同内容草稿；客户端重试导致同一草稿重复保存 | 草稿列表重复，医师复核负担增加，重复哈希冲突 | 3 | 3 | 2 | 18 | 稳定字段哈希：`draftHash.ts` 17–24（`StableDraftFields`）、59（`extractStableFields`）、85–89（SHA-256，89 行 `createHash('sha256')`）；哨兵去重：`sentinelGateway.ts` 63（`approvedHashes` 命中判定）；编排复用既有草稿：`consultOrchestrator.ts` 284–288（装载已批准哈希）、308–323（`duplicate` 分支复用既有草稿、落 `sentinel_duplicate` 审计）；单测 `draftHash.test.ts`（6 用例 / 6 断言） | 哨兵内存 `approvedHashes` 仅当前会话级（`sentinelGateway.ts` 63 附近 Map），跨请求 / 跨实例不共享去重；非 DEMO 库需另配草稿业务唯一约束；哈希稳定字段集合变更会导致旧哈希失配 | 安全闸 / 编排层 |

## 3. 环境未闭环残余风险汇总

以下事项在本机 DEMO 环境无法闭环验证，均已在对应行「残余风险」列标注；汇总口径取自 `reports/consult-deepen/coverage-round1.md` §6，不在本表重复扩展测试推定：

1. **无运行中 PostgreSQL**：迁移 `380`–`385` 六表未真实建表、未执行真实查询演练；非 DEMO 仓储路径仅保证编译通过与 mock pool 契约一致。
2. **无 LLM 凭证**：在线请求、响应解析、超时、重试路径未演练；当前 `degraded` 恒为 `true` 的离线模板口径不等于在线降级策略已完成设计。
3. **无真实 SSE / HTTP 联调**：中途断流、断线重连、超时降级、token 计量节流未覆盖；浏览器真实帧到达时序与代理缓冲行为未走查。
4. **浏览器视觉走查未执行**：按钮显隐、抽屉布局、草稿标签、置信度颜色在真实渲染窗口下的可用性未人工核对。
5. **覆盖率口径限制**：本轮 326 pass / 0 fail / 2090 expect / 26 文件仅反映三目录 DEMO 进程内测试；`bun text reporter` 不提供 statements / branches 独立百分比，本表不编造该两维数字。
6. **不计入本轮统计的既有失败**：`tests/unit/onlineConsult.test.ts` 日期硬编码 1 fail（F1）、`tests/unit/db/ddl.test.ts` check-sql 误报 1 fail（F2），归属其他分片，不在 consult 闭环范围内处置。

## 4. 风险接受与后续动作建议

- DEMO 演示与内部评审场景：FMEA-01、FMEA-08、FMEA-09、FMEA-17、FMEA-19 的残余风险在离线、单进程、无外部网络条件下可接受。
- 开放给真实医护 / 患者使用前，必须在具备真实 PostgreSQL、LLM 凭证与可联调 SSE 网络的环境补测 FMEA-01、FMEA-02、FMEA-04、FMEA-05、FMEA-06、FMEA-07、FMEA-08、FMEA-12、FMEA-13、FMEA-19，并由临床安全评审复核急症词表覆盖度与置信度阈值。
- 本表随代码基线演进更新；新增工具、新增审计动作、新增端点时，须在对应责任层补充失效模式行，并重算 S / O / D 与 RPN。

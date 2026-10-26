# 阶段① A 类 P1 第一批 9 条落地批次记录（S-phase1-P1-A22-Batch）

- **批次编号**：S-phase1-P1-A22-Batch（台账 A01 / A03 / A07 / A09 / A16 / A20 / A22 / A27 / A34）
- **产品**：健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）
- **署名**：杭州健澜科技有限公司
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- **分支**：`consult-agent-m86`
- **基线 HEAD**：`f4eef73993e74180dccdc7a04c649f780389bb71`（三端已一致；本轮开工前现场复核）
- **完成时间**：2026-10-27 03:05（Asia/Shanghai）
- **环境**：`DEMO_MODE=1`；无 PostgreSQL / Redis / 真实 LLM / 真实 ASR / Embedding / OCR 供应商凭证；纯类型 + 纯函数 + 进程内存态离线闭环；不发起 HTTP、不读 DB、不接真实事件总线；既有公开函数签名、BFF 调用面、前端路由 / 页面 / 挂载 / 权限码零改动。
- **Git 纪律**：本轮未执行 `git add` / `git commit` / `git push` / `git tag`；提交分组、双仓推送与三端 SHA 核对由主会话统一收口。

## 1. 目标与契约依据

### 1.1 批次目标

按主会话书面放行清单，落地阶段① A 类 P1 第一批 9 条离线缺口：在既有 S-02 / S-03 / S-04 / S-05 / S-06 / S-08 / S-11 / S-12 模块之上，以纯类型 + 纯函数 + 进程内存态补齐窗口聚合、预算档位推导、系统红线资产化、Schema 子集扩充、人工干预指标、拒答离线守卫、四元组绑定校验、检索结果协议适配、工具频次配额九组能力；既有测试断言零回改，未删改既有用例换绿灯。

### 1.2 放行清单与台账锚点（口径以 `reports/slices/S-phase1-gap-inventory/gap-inventory.md` §3 为准）

| 放行序 | A 编号 | 矩阵编号 | 台账锚点 / spec 章节 | 归属切片 | 落地模块 |
|---:|---|---|---|---|---|
| 1 | A20 | S-03（矩阵 237） | spec 3.3.5（419–442）；S-12 记录 §1.2-R-06；台账 A20 行 218 | S-12 / S-05 | `evidenceGuard.ts`（新增） |
| 2 | A22 | S-05 / 四维留痕（矩阵 239·305） | spec 3.6.5（738–767）；S-08 记录 §7.1-6；台账 A22 行 220 | S-08 / S-11 | `aiAudit.ts`（追加） |
| 3 | A07 | P-01（矩阵 210） | spec 3.4.3（494–507）；S-04 记录 §1.3-5、§7.1-5；台账 A07 行 195 | S-04 | `SystemPromptBuilder.ts` / `assetRegistry.ts` / `promptLoader.ts`（追加） |
| 4 | A09 | P-05（矩阵 214） | spec 3.4.4（509–520）；S-04 记录 §7.1-6；台账 A09 行 197 | S-04 | `schemaGuard.ts`（追加重构） |
| 5 | A01 | M-02（矩阵 182） | spec 3.2.4（295–311）；S-02 记录 §7.1-2；台账 A01 行 184 | S-02 | `modelHealthProbe.ts`（追加） |
| 6 | A03 | M-05（矩阵 185） | S-03 记录 §7.1-2；台账 A03 行 186 | S-03 | `modelRouter.ts`（追加） |
| 7 | A16 | A-04（矩阵 226） | spec 3.5.4（610–622）；S-06 记录 §7.1-3；台账 A16 行 209 | S-06 / S-05 | `agentAdmission.ts`（追加） |
| 8 | A27 | R-06（矩阵 200） | spec 3.3.5（419–442）；S-12 记录 §1.2-R-06、§1.3-2；台账 A27 行 230 | S-12 | `retrievalAdapter.ts`（新增） |
| 9 | A34 | O-03（矩阵 281） | spec 3.5.3 工具绑定口径；S-06 `ToolBinding`；台账 A34 行 242 | S-05 / S-06 | `toolQuota.ts`（新增） |

### 1.3 范围边界（本批次不做）

- **不碰 P2 第二批**：台账 A 类 44 条中除本批 9 条外，A10、A17、A28、A29、A35、A41 等其余 35 条 P2 未开工；B 类 78 条一律未实现。
- **不碰阶段②**：S-05 剩余（O-02 意图识别独立规划器、O-05 任务规划器、O-06 人工三模式规则、O-08 跨实例监控聚合）、S-07、S-14~S-17 未开工；阶段③ S-21~S-23 未提前启动。
- **不新增第三方依赖**：未引入 ajv / zod / 向量库 / HTTP 客户端；`package.json`、`package-lock.json`、`bun.lock`、`bun.lockb` 零改动（§4.5 复核留痕）。
- **不改既有公开面**：既有注册表方法签名、BFF 路由与调用面、前端路由 / 页面 / 挂载 / 权限码、`agents/manifest.json`、`src/bff/agents/index.ts`、`src/orchestrator/index.ts`、`src/bff/index.ts` 均未修改；新增符号以纯追加方式挂接，既有模块单例行为不变。
- **不接运行时外部资源**：不发起网络请求、不读 DB、不接真实 LLM / ASR / Embedding / OCR / 事件总线 / 真实邮件短信渠道；时间戳、阈值、窗口、标签条件一律由入参注入。
- **不携带患者明文**：新增结构与测试夹具仅使用 `patient-demo-001` / `visit-demo-001` / `doctor-demo-001` 合成标识；不写院方实名、密码、token、密钥、Bearer 长值、明文端点与制度文号。

## 2. 逐条落地口径

### 2.1 A20 无命中拒答离线守卫 + 审计标记映射（S-12 / S-05，安全底线优先）

**落地文件**：`src/knowledge-platform/citation/evidenceGuard.ts`（新增，147 行 / 6 217 字节）；测试 `tests/unit/knowledge-platform/citation/evidenceGuard.test.ts`（新增，161 行 / 6 514 字节）。

**类型契约**：

- `EvidenceGuardReason = 'NONE_EVIDENCE' | 'NO_CITATION_FOR_CLAIM' | 'PARTIAL_EVIDENCE' | 'SUPPORTED'`
- `EvidenceAuditSnapshot { level; hitCount; citationCount; chunkIds[]; reasonCode; markedNoEvidence; reviewedAt? }`：仅留级别、命中计数、引用计数、知识块 ID 清单、原因码、拒答标记与判定时间，**不含患者正文与候选答案原文**。
- `EvidenceGuardInput { hits?; candidateAnswer?; question?; missingInfo?; now? }`；`EvidenceGuardResult { allowed; answer; citations; level; reasonCode; markedNoEvidence; auditSnapshot }`。

**判定顺序（纯函数 `guardEvidenceAnswer`）**：

1. 命中为空 → `NONE_EVIDENCE`：强制 `buildNoEvidenceAnswer(question, missingInfo)` 模板，`allowed=false`、`markedNoEvidence=true`、引用清单为空；
2. 候选答案有非空正文但未附任何引用编号 → `NO_CITATION_FOR_CLAIM`：阻断并改用拒答模板；
3. 级别 `partial`（命中但存在待补充资料）→ `PARTIAL_EVIDENCE`：阻断放行，候选答案与既有引用透传保留，由调用方提示补充资料；
4. 级别 `supported` → `SUPPORTED`：放行，引用条目透传。

**复用底座**：`buildCitations`（同 chunkId 去重保留首条）、`deriveEvidenceLevel`、`buildNoEvidenceAnswer`、`CitationHit / Citation / CitedAnswer` 来自既有 S-12 `citationProtocol.ts`；`EvidenceLevel` 来自 `@/security/ai/types.js`；未回改既有协议测试断言。

**断言要点（8 例 / 42 expect）**：命中为空阻断 + 拒答模板 + 拒答标记，模板不含「确诊」「诊断为」等确定性诊断措辞；候选主张无引用阻断；partial 阻断且保留引用；supported 放行；未传候选答案时由守卫装配引用；空入参按空台账处理不抛错；审计快照仅留计数 / chunkId / 级别 / 原因码，不携带患者正文；传入 `now` 时间戳快照留痕 `reviewedAt`。

### 2.2 A22 模型 / 知识 / 提示词 / 发布版本四元组强绑定离线一致性校验（S-08 / S-11）

**落地文件**：`src/security/audit/aiAudit.ts`（追加 152 行 / 0 删除）；测试 `tests/unit/security/aiAudit.test.ts`（追加，581 行 / 25 210 字节）。

**类型契约**：

- `BindingEntry { version; status }`；`VersionBindingProviders { model?; prompt?; knowledge?; platformRelease? }`；`VersionBindingReport { valid; errors[] }`。
- 新错误码 `AUD_ERROR_BINDING_FAILED = 'AUD-008'`；既有 `AUD-001`~`AUD-007` 口径不变。

**校验纯函数 `validateVersionBinding(versions, providers)`**：

- **模型维**：台账可读时，`modelId` 必须登记、状态 `active`、台账版本与快照 `modelVersion` 一致；
- **提示词维**：台账可读时，`promptVersion` 必须存在于已生效提示词条目且状态 `active`、版本一致；
- **知识维**：`knowledgeVersion` 清单逐条必须在知识台账登记、状态 `approved`、版本号一致；空条目直接拒绝；
- **平台发布维**：快照 `platformRelease` 非空；注入当前发布版本时必须一致；
- 对应台账未注入时跳过该维台账解析（结构非空性仍由既有 `validateAiAuditInput` 把关）；任一不一致返回结构化中文错误清单并阻断入链；错误信息仅含引用标识与判定结论，不泄露台账表结构、私有字段与仓储路径。

**只读适配器工厂**：`createModelBindingProvider` / `createPromptBindingProvider` / `createKnowledgeBindingProvider` 以结构化 duck-typed 入参转发只读调用，不反向导入 BFF / knowledge 层类型（避免循环依赖），不暴露登记 / 发布 / 归档等写方法。

**断言要点（追加 8 例，合计 29 / 0 / 117）**：四维齐全有效通过；模型未登记 / 状态非 active / 版本不一致分别拒绝；提示词未生效 / 版本不匹配拒绝；知识条目未登记 / 非 approved / 版本不一致逐条拒绝；平台发布缺失或与当前发布不一致拒绝；台账未注入时跳过该维；适配器工厂只读转发；既有哈希链 `verifyChain` 断言不回归。

### 2.3 A07 ETHICS_LAYER 六条红线迁入 system 资产库，版本化 + 不可覆盖校验（S-04）

**落地文件**：

- `src/core/agent/SystemPromptBuilder.ts`（追加 16 / 删除 9）：六条文本抽为模块级导出常量 `ETHICS_LAYER_TEXT`，类内 `private static readonly ETHICS_LAYER` 引用同一常量；文本与拼装行为零改动。
- `src/bff/prompt/assetRegistry.ts`（追加 78 / 0）：`SYSTEM_ETHICS_ASSET_ID = 'prompt-system-ethics-001'`、`SystemEthicsSeedMeta`、`isReservedSystemAssetId`、`buildSystemEthicsSeedAsset(meta?)`、`registerSystemEthicsSeed(registry, meta?)`。
- `src/bff/prompt/promptLoader.ts`（追加 36 / 0）：`SystemPromptContext` 新增可选 `packageSystemPrompt`；加载器顶部 PL-004 system 覆盖保护；`findSystemEthicsSeed(registry)`、`isSystemReservedAsset(id)`。
- 测试：`tests/unit/bff/prompt/assetRegistry.test.ts`（追加，394 行 / 17 151 字节）、`tests/unit/bff/prompt/promptLoader.test.ts`（追加，310 行 / 11 312 字节）。

**口径要点**：

- 种子资产 `version='1.0.0'`、`riskLevel='high'`、`status='active'`，变更记录留痕首版审批；内容与既有 `ETHICS_LAYER` 同源，`variables=[]`、`fewShotRefs=[]`；`operator` 缺省 `platform-governance`、`approver` 沿用岗位台账合成角色标识，可由 `meta` 入参注入。
- `registerSystemEthicsSeed` 幂等：已登记直接回读现有资产深拷贝，不重复登记、不覆盖既有内容；**函数不自动写入模块单例**，由调用方显式传入台账实例；空注册表回退 `SystemPromptBuilder.build()` 的既有路径与断言（`assetIds=[]`、`versionRef=[]`）零变化。
- 智能体包携带 `packageSystemPrompt` 即触发 `prompt-system-override-rejected` 安全事件并抛 `[PL-004]`，system 层不可被智能体包覆盖；该保护与空台账回退路径相互独立。
- 仅迁移六条伦理红线，不迁移其他岗位提示词；`findSystemEthicsSeed` 为只读回读，不触发登记、不回退 builder。

**断言要点**：assetRegistry 追加 4 例（种子工厂字段与版本留痕、幂等登记不重复、保留 ID 判定、深拷贝隔离）；promptLoader 追加 3 例（携带 system 文本拒绝并写安全事件、只读种子查询、空台账回退默认文本断言保持通过）。

### 2.4 A09 schemaGuard 补 pattern / minimum / maximum / minLength / maxLength / items / oneOf（S-04）

**落地文件**：`src/bff/prompt/schemaGuard.ts`（追加 88 / 删除 23，`validateSchema` 重构为递归 `validateNode`）；测试 `tests/unit/bff/prompt/schemaGuard.test.ts`（追加，278 行 / 11 758 字节）。

**新增校验口径**：

- 字符串 `pattern`：离线 `RegExp` 匹配；表达式非法时收集错误并跳过格式校验，不抛异常；
- 数值 `minimum / maximum`：取值上下界，越界报错；
- 字符串 `minLength / maxLength`：字符长度边界；
- 数组 `items`：逐元素递归复用同一校验口径，元素路径带 `[i]` 下标；
- `oneOf`：候选 Schema 恰好命中一条；命中 0 条或 ≥2 条均报错；
- 嵌套 `properties + items` 错误定位到字段路径；对象属性路径前缀 `字段「x」`，数组元素路径 `字段「x」[i]`。

**既有口径保留**：`type / required / properties / enum` 错误文案与行为保持不变（`应为 object 类型`、`缺少必填字段「x」`、`取值不在枚举范围内`、`未知 schema type` 等既有断言不回归）；`additionalProperties` 仍不阻断；不引入 ajv 等第三方依赖。

**断言要点（追加 6 例，合计 19 / 0 / 75）**：pattern 正反用例与非法正则容错；minimum / maximum 边界正反用例；minLength / maxLength 边界正反用例；items 递归校验与数组下标路径；oneOf 命中一条通过、命中 0 条与 2 条均报错；嵌套 `properties + items` 路径定位；既有 type / required / enum 用例保持通过。

### 2.5 A01 成功率 / 错误率 / 时延滑动窗口聚合纯函数（S-02）

**落地文件**：`src/bff/agents/modelHealthProbe.ts`（追加 105 / 0）；测试 `tests/unit/bff/agents/modelHealthProbeWindow.test.ts`（新增，114 行 / 4 387 字节）。

**类型契约**：

- `HealthWindowEvent { cardId; available; latencyMs?; at }`（`at` 为 epoch 毫秒，调用方注入，不依赖系统时钟）；
- `HealthWindowSummary { cardId; windowMs; sampleCount; successCount; failureCount; successRate; errorRate; avgLatencyMs; consecutiveFailures; circuitOpen }`；
- `buildHealthWindowEvent(cardId, outcome, at)` 纯构造；`aggregateHealthWindow(events, cardId, now, windowMs, options?)` 纯聚合。

**聚合口径**：仅统计闭区间 `[now - windowMs, now]` 内、`cardId` 匹配事件；窗口外事件不计入；空台账 `successRate / errorRate / avgLatencyMs` 记 0、`consecutiveFailures=0`、`circuitOpen=false`；平均时延仅取成功样本中的有限非负时延；`consecutiveFailures` 为时间倒序尾部连续失败数；达到默认熔断阈值 `DEFAULT_PROBE_FAILURE_THRESHOLD=3`（可入参 `failureThreshold` 覆盖）置 `circuitOpen=true`，与既有 `probeOnce` 熔断口径一致；纯函数不发起 HTTP、不持久化、不读取进程外指标。

**断言要点（7 例 / 26 expect）**：窗口内成功 / 失败样本计数与比率；空台账比率记 0；窗口外事件剔除；平均时延仅统计成功样本；尾部连续失败计数与熔断置位；自定义阈值覆盖熔断判定；时间戳注入下窗口边界（含端点）判定正确。

### 2.6 A03 tokenBudget→contextLength 映射与成本 / 时延档位推导纯函数（S-03）

**落地文件**：`src/bff/agents/modelRouter.ts`（追加 107 / 0）；测试 `tests/unit/bff/agents/modelRouter.test.ts`（追加，596 行 / 25 269 字节）。

**类型契约**：`TierUnknown='unknown'`；`BudgetTierRule { maxTokens; contextLength }`；`TOKEN_BUDGET_BANDS`（4000 short / 16000 medium / 末档 long，上界含边界）；`CostTierBounds { lowMax?=0.5; mediumMax?=2 }`；`LatencyTierBounds { fastMax?=300; mediumMax?=800 }`；`BudgetProfileInput { tokenBudget?; costPer1kInput?; latencyMs? }`；`BudgetProfile { contextLength; costTier; latencyTier }`。

**纯函数**：

- `deriveContextLength(tokenBudget?, bands?)`：未给预算 / NaN / 非正值 / 规则表未命中返回 `unknown`，不默认高配；边界 4000 → short、16000 → medium；规则表可入参覆盖；
- `deriveCostTier(costPer1kInput?, bounds?)`：未给值或非有限值返回 `unknown`；阈值可入参覆盖；
- `deriveLatencyTier(latencyMs?, bounds?)`：未给值或非有限值返回 `unknown`；阈值可入参覆盖；
- `deriveBudgetProfile(input)`：三维独立判定，缺省维记 `unknown`，该维不约束规则匹配。

**断言要点（追加 9 例，合计 45 / 0 / 149）**：预算分档边界含等号；未给 / 非法预算返回 `unknown`；成本档阈值正反边界；时延档阈值正反边界；汇总剖面三维独立、缺省维 unknown；自定义阈值表覆盖；不读取进程外指标；既有 `selectModel` / 规则校验 / 粘性路由断言不回归。

### 2.7 A16 人工干预点指标类型与内存聚合（S-06 / S-05）

**落地文件**：`src/bff/agents/agentAdmission.ts`（追加 157 / 0）；测试 `tests/unit/bff/agents/agentAdmission.test.ts`（追加，730 行 / 34 274 字节）。

**类型契约**：

- `InterventionAction = 'adopted' | 'modified' | 'rejected' | 'escalated' | 'pending'`，与 S-05 `humanAction`、S-08 `AiHumanAction` 同口径；`INTERVENTION_ACTIONS` 只读数组；
- `HumanInterventionMetric { humanAction; nodeId; agentId; agentVersion; reviewerId?; comment?; at; scenario? }`，字段与 S-05 `monitoringEvents` 人工干预负载一一映射；
- `InterventionFilter { agentId?; agentVersion?; nodeId?; action?; scenario?; from?; to? }`；`InterventionAggregate { total; byAction; byNode; byAgent }`。

**纯函数与注册表方法**：`emptyInterventionCounts()`、`normalizeInterventionNodeId(nodeId)`（缺失 / 空串 / 空白显式记 `unknown`）、`appendInterventionMetric(list, record)`（不改入参台账）、`aggregateInterventions(records, filter?)`；注册表新增 `recordInterventionMetric` / `queryInterventionMetrics` / `aggregateInterventionMetrics` 与进程内 `interventions` 内存数组；非法动作、缺失 `agentId / agentVersion`、非有限时间戳抛 `[ADM-008]`；查询结果深拷贝隔离；不订阅事件总线。

**断言要点（追加 7 例，合计 34 / 0 / 155）**：三类（五动作）计数独立可查；节点 / 智能体分组聚合正确；缺失节点显式记 `unknown` 且按 `unknown` 可筛回；按动作 / 智能体 / 版本 / 场景 / 时间窗组合过滤；错误动作 / 缺失标识 / 非法时间戳拒绝；字段与 S-05 事件口径映射一致；查询深拷贝隔离；纯函数不改入参、空记录聚合计数为零。

### 2.8 A27 协议层挂接既有 hybrid 结果纯适配器（S-12）

**落地文件**：`src/knowledge-platform/citation/retrievalAdapter.ts`（新增，132 行 / 5 230 字节）；测试 `tests/unit/knowledge-platform/citation/retrievalAdapter.test.ts`（新增，124 行 / 5 198 字节）。

**类型契约**：`RetrievalAdapterOptions { minScore?; requiredTags?; question?; missingInfo?; now? }`；`RetrievalAdapterResult extends EvidenceGuardResult { mappedHits; rawCount; retainedCount; droppedByTag; droppedBelowThreshold }`。

**适配口径（纯函数 `adaptRetrievalHits(rawHits, options)`）**：

1. **标签前置过滤**：`requiredTags` 与 `metadata.tags` 相交才保留；`metadata.tags` 缺失或非字符串数组视为不匹配，计入 `droppedByTag`；
2. **阈值剔除**：`score < minScore`（含边界 `score >= minScore` 保留）计入 `droppedBelowThreshold`；`minScore` 缺省 0；
3. **字段无损映射**：`chunkId=id`、`title`、`sectionPath ?? ''`、`provenance`、`pageRef / effectiveDate` 取自 `metadata` 只读字符串、`score` 非有限记 0、`graphPath`、`quotedExcerpt=content`、`content`、`securityLevel` 校验合法四档（`public / internal / confidential / restricted`）否则留空、`conflictGroup` 取自 `metadata`；
4. 映射命中交 `guardEvidenceAnswer` 做级别推导与拒答判定；剔除后命中为空时守卫输出无依据拒答结构；`rawCount / retainedCount / droppedByTag / droppedBelowThreshold` 计数留痕。

**边界**：不回改 `hybrid.ts` 内部算法；不调用 Embedding / 向量供应商；标签条件与阈值由入参构造。

**断言要点（6 例 / 41 expect）**：字段无损映射清单逐项核对；标签相交保留 / 不相交剔除；阈值上下边界（等于阈值保留、低于剔除）；标签缺失剔除计数；剔除为空输出拒答结构；剔除计数与原始 / 保留计数一致。

### 2.9 A34 工具频次 / 配额限流纯计数器与判定函数（S-05 / S-06）

**落地文件**：`src/orchestrator/engine/toolQuota.ts`（新增，181 行 / 7 554 字节）；测试 `tests/unit/orchestrator/toolQuota.test.ts`（新增，145 行 / 6 613 字节）。

**类型契约**：`ToolQuotaPolicy { toolId; roles?; windowMs; limit }`；`ToolQuotaDecisionKind = 'allowed' | 'throttled'`；`ToolQuotaDecision { decision; remaining; policyToolId?; reason? }`；`QUOTA_UNLIMITED = Number.POSITIVE_INFINITY`；`QUOTA_ERROR_PREFIX = 'QUOTA-'`。

**纯函数与守卫**：`policyAppliesToRole(policy, role)`（未配置角色集合 = 全部适用）；`validateToolQuotaPolicy(policy)` 返回中文错误清单；`ToolQuotaGuard` 类含 `registerPolicy`（结构非法抛中文错误、存储深拷贝）、`listPolicies`（深拷贝数组）、`evaluate`（只读判定不累计）、`consume`（放行时累计、超限不累计）、`reset`；计数器按 `toolId::role` 分键；窗口过期自动清零；未配置策略默认放行且剩余额度 `Infinity`；角色集合外默认放行；模块级单例 `getToolQuotaGuard()` 与测试重置 `_resetToolQuotaGuard()`。

**口径**：计数进程内生命周期，不持久化；计数器不携带患者正文；不接外部配额服务；时间戳由入参注入；限流原因仅含工具 id、窗口与上限，不泄露台账内部结构。

**断言要点（11 例 / 39 expect）**：未配置策略默认放行、剩余额度无限大且不计数；窗口内累计与剩余额度递减、超限限流且不继续累计；`evaluate` 只读不累计；不同工具计数隔离；角色集合内受约束、集合外与未注入角色默认放行；不同角色计数按键隔离；窗口过期计数清零；窗口边界（恰在 `windowMs` 处）视为过期；非法策略返回中文错误清单并拒绝登记；`reset` 清空策略与计数器；单例重置可用。

## 3. 文件清单

绝对路径前缀：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\`；行数 / 字节为现场实测；增删行取自 `git diff --numstat`（新增文件无基线对照）。

### 3.1 新增源码（3 个）

| 相对路径 | 行数 | 字节 | 对应 A 编号 | 说明 |
|---|---:|---:|---|---|
| `src/knowledge-platform/citation/evidenceGuard.ts` | 147 | 6 217 | A20 | 无命中 / 无引用 / partial / supported 四级离线守卫与结构化审计快照 |
| `src/knowledge-platform/citation/retrievalAdapter.ts` | 132 | 5 230 | A27 | 既有检索结果 → 协议层 `CitationHit` 纯适配器，标签过滤 + 阈值剔除 + 守卫交接 |
| `src/orchestrator/engine/toolQuota.ts` | 181 | 7 554 | A34 | 工具配额策略校验、内存计数器、放行 / 限流判定与单例 |

### 3.2 修改源码（8 个，纯追加为主；schemaGuard 为递归重构、SystemPromptBuilder 为常量抽取）

| 相对路径 | 行数 | 字节 | 增 / 删行 | 对应 A 编号 | 说明 |
|---|---:|---:|---:|---|---|
| `src/core/agent/SystemPromptBuilder.ts` | 211 | 8 292 | +16 / −9 | A07 | 导出 `ETHICS_LAYER_TEXT`，类内静态字段引用同一常量，文本与拼装零改动 |
| `src/bff/prompt/assetRegistry.ts` | 540 | 21 711 | +78 / −0 | A07 | 系统伦理种子资产工厂、幂等登记、保留 ID 判定 |
| `src/bff/prompt/promptLoader.ts` | 298 | 11 794 | +36 / −0 | A07 | system 覆盖 PL-004 拒绝保护、种子只读查询辅助 |
| `src/bff/prompt/schemaGuard.ts` | 318 | 11 569 | +88 / −23 | A09 | 递归 `validateNode`，补 pattern / minimum / maximum / minLength / maxLength / items / oneOf |
| `src/bff/agents/modelHealthProbe.ts` | 296 | 11 140 | +105 / −0 | A01 | 窗口事件类型、事件构造器与滑动窗口聚合纯函数 |
| `src/bff/agents/modelRouter.ts` | 605 | 23 119 | +107 / −0 | A03 | 预算分档规则表与 contextLength / costTier / latencyTier / 剖面推导纯函数 |
| `src/security/audit/aiAudit.ts` | 669 | 28 322 | +152 / −0 | A22 | 四元组绑定校验纯函数、三个只读适配器工厂、AUD-008 错误码 |
| `src/bff/agents/agentAdmission.ts` | 1 123 | 43 807 | +157 / −0 | A16 | 干预动作 / 指标类型 / 过滤与聚合纯函数、注册表三方法与内存台账 |

### 3.3 新增测试（4 个）

| 相对路径 | 行数 | 字节 | 对应 A 编号 | pass / fail / expect |
|---|---:|---:|---|---|
| `tests/unit/bff/agents/modelHealthProbeWindow.test.ts` | 114 | 4 387 | A01 | 7 / 0 / 26 |
| `tests/unit/knowledge-platform/citation/evidenceGuard.test.ts` | 161 | 6 514 | A20 | 8 / 0 / 42 |
| `tests/unit/knowledge-platform/citation/retrievalAdapter.test.ts` | 124 | 5 198 | A27 | 6 / 0 / 41 |
| `tests/unit/orchestrator/toolQuota.test.ts` | 145 | 6 613 | A34 | 11 / 0 / 39 |

### 3.4 追加测试（6 个，既有断言零回改；括号内为基线 → 本轮）

| 相对路径 | 行数 | 字节 | 增 / 删行 | 对应 A 编号 | 基线 pass/fail/expect → 本轮 |
|---|---:|---:|---:|---|---|
| `tests/unit/bff/agents/modelRouter.test.ts` | 596 | 25 269 | +90 / −0 | A03 | 36 / 0 / 109 → 45 / 0 / 149 |
| `tests/unit/bff/prompt/assetRegistry.test.ts` | 394 | 17 151 | +51 / −0 | A07 | 25 / 0 / 60 → 29 / 0 / 80 |
| `tests/unit/bff/prompt/promptLoader.test.ts` | 310 | 11 312 | +49 / −0 | A07 | 8 / 0 / 28 → 11 / 0 / 40 |
| `tests/unit/bff/prompt/schemaGuard.test.ts` | 278 | 11 758 | +94 / −0 | A09 | 13 / 0 / 47 → 19 / 0 / 75 |
| `tests/unit/security/aiAudit.test.ts` | 581 | 25 210 | +164 / −0 | A22 | 21 / 0 / 85 → 29 / 0 / 117 |
| `tests/unit/bff/agents/agentAdmission.test.ts` | 730 | 34 274 | +166 / −0 | A16 | 27 / 0 / 119 → 34 / 0 / 155 |

### 3.5 未改动项（回归边界）

既有 S-01 `outputGuard`、S-02 `modelRegistry` / `modelHealthProbe` 探测循环本体、S-04 `metricsAggregator`、S-06 既有运行指标方法、S-08 哈希链与台账方法、S-11 `knowledgeRegistry`、S-12 `citationProtocol`、S-13 `patientIsolation`、S-09 门诊包、S-10 住院包、S-05 六个编排测试文件均未修改；`package.json`、`package-lock.json`、`bun.lock`、`bun.lockb`、`agents/manifest.json`、`src/bff/agents/index.ts`、`src/orchestrator/index.ts`、`src/bff/index.ts` 经 `git status --porcelain` 复核为零改动；前端 `web/` 目录本轮零源码改动。

## 4. 测试与门禁结果（2026-10-27 02:50–03:05 现场复跑，退出码取自进程真实结果）

### 4.1 双 tsc 门禁

| 门禁 | 命令 | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根目录（实现后首跑） | `node node_modules/typescript/bin/tsc --noEmit`（cwd=仓库根） | **0** | `logs/a22-p1-tsc-root-20261027-p1.log` | 0（零诊断） |
| web 目录（实现后首跑） | `bun x tsc --noEmit`（cwd=`web`；bun 全路径调用） | **0** | `logs/a22-p1-tsc-web-20261027-p1.log` | 0（零诊断） |
| 根目录（终态复跑，记录落盘后） | `node node_modules/typescript/bin/tsc --noEmit` | **0** | `logs/a22-p1-final-tsc-root-20261027-p1.log` | 0（零诊断） |
| web 目录（终态复跑，记录落盘后） | `bun x tsc --noEmit`（cwd=`web`） | **0** | `logs/a22-p1-final-tsc-web-20261027-p1.log` | 0（零诊断） |

> 修复留痕：首轮根 tsc 报 3 类类型错误——`EvidenceGuardInput.hits` 改为可选、`EvidenceGuardResult` 顶层补 `markedNoEvidence` 字段；`aiAudit.test.ts` 适配器返回类型含 `undefined` 致 `.getCard` 空值报错，测试内改为可选链判定；就地修复后复跑清零（§6.1）。

### 4.2 本轮新增 / 追加测试（10 个文件，合计 199 pass / 0 fail / 764 expect）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/bff/agents/modelHealthProbeWindow.test.ts` | 7 | 0 | 26 | 1294.00ms | `logs/a22-p1-tests-unit-bff-agents-modelHealthProbeWindow-20261027-p1.log` |
| `tests/unit/knowledge-platform/citation/evidenceGuard.test.ts` | 8 | 0 | 42 | 1030.00ms | `logs/a22-p1-tests-unit-knowledge-platform-citation-evidenceGuard-20261027-p1.log` |
| `tests/unit/knowledge-platform/citation/retrievalAdapter.test.ts` | 6 | 0 | 41 | 928.00ms | `logs/a22-p1-tests-unit-knowledge-platform-citation-retrievalAdapter-20261027-p1.log` |
| `tests/unit/orchestrator/toolQuota.test.ts` | 11 | 0 | 39 | 971.00ms | `logs/a22-p1-tests-unit-orchestrator-toolQuota-20261027-p1.log` |
| `tests/unit/bff/agents/modelRouter.test.ts` | 45 | 0 | 149 | 973.00ms | `logs/a22-p1-tests-unit-bff-agents-modelRouter-20261027-p1.log` |
| `tests/unit/bff/prompt/assetRegistry.test.ts` | 29 | 0 | 80 | 923.00ms | `logs/a22-p1-tests-unit-bff-prompt-assetRegistry-20261027-p1.log` |
| `tests/unit/bff/prompt/promptLoader.test.ts` | 11 | 0 | 40 | 1003.00ms | `logs/a22-p1-tests-unit-bff-prompt-promptLoader-20261027-p1.log` |
| `tests/unit/bff/prompt/schemaGuard.test.ts` | 19 | 0 | 75 | 978.00ms | `logs/a22-p1-tests-unit-bff-prompt-schemaGuard-20261027-p1.log` |
| `tests/unit/security/aiAudit.test.ts` | 29 | 0 | 117 | 944.00ms | `logs/a22-p1-tests-unit-security-aiAudit-20261027-p1.log` |
| `tests/unit/bff/agents/agentAdmission.test.ts` | 34 | 0 | 155 | 945.00ms | `logs/a22-p1-tests-unit-bff-agents-agentAdmission-20261027-p1.log` |

### 4.3 既有基线回归（26 个未改动测试文件，合计 317 pass / 0 fail / 992 expect，与 S-02~S-13 复核基线逐项一致）

| 测试文件 | pass | fail | expect | 日志 |
|---|---:|---:|---:|---|
| `tests/unit/security/outputGuard.test.ts` | 18 | 0 | 40 | `logs/a22-p1-regression-tests-unit-security-outputGuard.log` |
| `tests/unit/bff/agents/modelRegistry.test.ts` | 36 | 0 | 106 | `logs/a22-p1-regression-tests-unit-bff-agents-modelRegistry.log` |
| `tests/unit/bff/agents/modelHealthProbe.test.ts` | 12 | 0 | 48 | `logs/a22-p1-regression-tests-unit-bff-agents-modelHealthProbe.log` |
| `tests/unit/bff/prompt/metricsAggregator.test.ts` | 8 | 0 | 24 | `logs/a22-p1-regression-tests-unit-bff-prompt-metricsAggregator.log` |
| `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts` | 24 | 0 | 90 | `logs/a22-p1-regression-tests-unit-knowledge-platform-lifecycle-knowledgeRegistry.log` |
| `tests/unit/knowledge-platform/citation/citationProtocol.test.ts` | 27 | 0 | 80 | `logs/a22-p1-regression-tests-unit-knowledge-platform-citation-citationProtocol.log` |
| `tests/unit/knowledge-platform/isolation/patientIsolation.test.ts` | 33 | 0 | 98 | `logs/a22-p1-regression-tests-unit-knowledge-platform-isolation-patientIsolation.log` |
| `tests/unit/orchestrator/monitoringEvents.test.ts` | 3 | 0 | 13 | `logs/a22-p1-regression-tests-unit-orchestrator-monitoringEvents.log` |
| `tests/unit/orchestrator/similarCaseAdapter.test.ts` | 5 | 0 | 15 | `logs/a22-p1-regression-tests-unit-orchestrator-similarCaseAdapter.log` |
| `tests/unit/orchestrator/snapshotResume.test.ts` | 4 | 0 | 16 | `logs/a22-p1-regression-tests-unit-orchestrator-snapshotResume.log` |
| `tests/unit/orchestrator/auditBatchBridge.test.ts` | 5 | 0 | 25 | `logs/a22-p1-regression-tests-unit-orchestrator-auditBatchBridge.log` |
| `tests/unit/orchestrator/snapshotStore.test.ts` | 10 | 0 | 43 | `logs/a22-p1-regression-tests-unit-orchestrator-snapshotStore.log` |
| `tests/unit/orchestrator/specialNodes.test.ts` | 14 | 0 | 23 | `logs/a22-p1-regression-tests-unit-orchestrator-specialNodes.log` |
| `tests/unit/bff/agents/outpatient/intentClassifier.test.ts` | 7 | 0 | 18 | `logs/a22-p1-regression-tests-unit-bff-agents-outpatient-intentClassifier.log` |
| `tests/unit/bff/agents/outpatient/dialogueNormalizer.test.ts` | 6 | 0 | 18 | `logs/a22-p1-regression-tests-unit-bff-agents-outpatient-dialogueNormalizer.log` |
| `tests/unit/bff/agents/outpatient/draftSchema.test.ts` | 10 | 0 | 21 | `logs/a22-p1-regression-tests-unit-bff-agents-outpatient-draftSchema.log` |
| `tests/unit/bff/agents/outpatient/agentPackage.test.ts` | 4 | 0 | 29 | `logs/a22-p1-regression-tests-unit-bff-agents-outpatient-agentPackage.log` |
| `tests/unit/bff/agents/outpatient/qcRealtime.test.ts` | 9 | 0 | 11 | `logs/a22-p1-regression-tests-unit-bff-agents-outpatient-qcRealtime.log` |
| `tests/unit/bff/agents/outpatient/outpatientWorkflow.test.ts` | 12 | 0 | 39 | `logs/a22-p1-regression-tests-unit-bff-agents-outpatient-outpatientWorkflow.log` |
| `tests/unit/bff/agents/inpatient/consistencyCheck.test.ts` | 6 | 0 | 6 | `logs/a22-p1-regression-tests-unit-bff-agents-inpatient-consistencyCheck.log` |
| `tests/unit/bff/agents/inpatient/inpatientWorkflow.test.ts` | 17 | 0 | 58 | `logs/a22-p1-regression-tests-unit-bff-agents-inpatient-inpatientWorkflow.log` |
| `tests/unit/bff/agents/inpatient/dischargeSchema.test.ts` | 13 | 0 | 26 | `logs/a22-p1-regression-tests-unit-bff-agents-inpatient-dischargeSchema.log` |
| `tests/unit/bff/agents/inpatient/documentTemplates.test.ts` | 15 | 0 | 49 | `logs/a22-p1-regression-tests-unit-bff-agents-inpatient-documentTemplates.log` |
| `tests/unit/bff/agents/inpatient/vitalsParser.test.ts` | 9 | 0 | 36 | `logs/a22-p1-regression-tests-unit-bff-agents-inpatient-vitalsParser.log` |
| `tests/unit/bff/agents/inpatient/agentPackage.test.ts` | 5 | 0 | 41 | `logs/a22-p1-regression-tests-unit-bff-agents-inpatient-agentPackage.log` |
| `tests/unit/bff/agents/shared/clinicalReportInterpretation.test.ts` | 5 | 0 | 19 | `logs/a22-p1-regression-tests-unit-bff-agents-shared-clinicalReportInterpretation.log` |

> 汇总 CSV：`logs/a22-p1-regression-summary.csv`；合计 26 文件、317 pass / 0 fail / 992 expect；未删用例、未改既有断言换绿灯。S-09 门诊 48 pass / 136 expect + shared 5 pass / 19 expect 与基线 53 pass / 155 expect 口径一致；S-10 住院 65 pass / 216 expect 与基线一致。

### 4.4 工程合规自查

- **依赖零新增**：未引用 `package.json` 未安装依赖；TypeScript strict；ESM；`@/` 别名 + `.js` 后缀；未新增第三方包。
- **品牌扫描**：本轮 11 个源码文件 + 10 个测试文件共 21 个对象扫描，禁用代号 `gang-os`、`gangos-`、`Gang-OS`、`GangOS`、`Jianlan OS`、`杠OS`、`建兰`、`数智医院` 命中 0（英文 / 中文两轮脚本扫描，证据 `logs/a22-p1-scan-20261027-p1.log`、`logs/a22-p1-chinese-scan-20261027-p1.log`）。
- **密钥 / 端点扫描**：明文 `password=`、`apiKey=`、`Bearer` 长值、私钥头、明文 `http://` / `https://` 端点命中 0；`token` / `tokens` 宽口径复核无凭证类命中。
- **占位符扫描**：源码 / 测试未解析 `TODO` / `FIXME` / `XXX` / 中文待定占位命中 0。
- **测试夹具**：仅使用 `patient-demo-001` / `visit-demo-001` / `doctor-demo-001` 与既有合成角色标识；无院方实名、密码、token、密钥、制度文号；日志不含大段患者文本。
- **受保护文件**：`package.json`、`package-lock.json`、`bun.lock`、`bun.lockb`、`agents/manifest.json`、`src/bff/agents/index.ts`、`src/orchestrator/index.ts`、`src/bff/index.ts` 零改动（`git status --porcelain` 复核留痕）。
- 证据日志位于 `logs/`（已 gitignore）；本轮未执行任何 git 写操作。

## 5. 遗留风险与未闭环项（如实登记，本批次不实现）

1. **A01 窗口台账来源**：聚合纯函数作用于调用方注入的事件台账；既有 `startProbeLoop` 的 HTTP 探测调度、熔断状态机与持久化口径不变；事件台账跨进程 / 重启恢复与落库归 B 类持久化批次。
2. **A03 档位来源**：`costTier / latencyTier` 为入参推导纯函数，不采集供应商真实报价与实时时延；上游路由决策接入真实指标采集与运行时联动归后续运行时切片。
3. **A07 种子注册策略**：种子工厂不自动写入模块单例；运行时由哪一层在启动阶段显式登记系统红线资产、版本升级与变更审批流归后续集成批次；其余岗位提示词仍走 `SystemPromptBuilder.build()` 兜底，未向资产库迁移。
4. **A09 Schema 子集边界**：本批仅补齐 pattern / minimum / maximum / minLength / maxLength / items / oneOf；`format`、`const`、`if/then`、嵌套 `oneOf` 内 `properties` 等完整 JSON Schema 口径未实现；按边界未引入 ajv / zod。
5. **A16 指标告警联动**：干预指标为内存台账；阈值告警、`normal / warn / suspend-suggestion` 建议事件归 P2 A17；真实降级 / 暂停执行与落库归 B31；本批未订阅事件总线。
6. **A20 守卫运行时挂接**：`guardEvidenceAnswer` 为进程内纯函数，未挂载到模型输出前置流水线；事件总线订阅、S-08 审计事件实写入链归后续集成切片；快照结构已按审计留痕需要预留。
7. **A22 校验接线层**：`validateVersionBinding` 在 providers 注入时生效；审计服务运行时与三个内存台账的注入挂接、四维快照跨病历一致性巡检归后续集成切片；台账持久化归 B 类；错误信息不泄露台账内部结构。
8. **A27 检索链路边界**：适配器仅映射既有 hybrid 内存结果；真实向量召回、相似度打分模型、跨科室知识检索归 B19 / B 类；`hybrid.ts` 内部算法本轮未回改。
9. **A34 配额持久化与外部服务**：计数器为进程内存态，重启清零；DB 配额计数、HIS / EMR 网络授权接口、BFF 工具管理路由与前端页面归 B48；既有工具真实执行路径与风险分级未改动。
10. **未开工范围声明**：P2 第二批 35 条 A 类、B 类 78 条全部未开工；阶段② S-05 剩余（O-02 意图识别独立规划器、O-05 任务规划器、O-06 人工三模式规则、O-08 跨实例监控聚合）、S-07、S-14~S-17 未开工；阶段③ S-21~S-23 未提前启动。

## 6. 偏差与如实说明

### 6.1 过程修复留痕

- 首轮根 tsc 退出码 2：`EvidenceGuardInput.hits` 由必选改为可选并在函数内归一化为空数组；`EvidenceGuardResult` 顶层补 `markedNoEvidence` 字段；`aiAudit.test.ts` 适配器工厂返回类型含 `undefined`，测试断言改为可选链判定；修复后双 tsc 复跑退出码 0、诊断 0 字节。
- `evidenceGuard.test.ts` 首轮 1 fail：测试问题文案本身含确定性词「一定」，回填拒答模板后触发 `not.toContain('一定')` 断言；按边界将问题改为中性表述「胸痛三天需要排查哪些疾病？」，断言仅校验守卫模板不含「确诊」「诊断为」等确定性诊断措辞；问题原文中的词汇不属于守卫生成的结论表述，口径已在测试注释中说明。

### 6.2 与台账口径的偏差记录

- **A07 种子不自动注册**：台账口径允许「登记进内存台账」；本批实现将登记动作收敛为显式 `registerSystemEthicsSeed(registry, meta?)` 工厂函数，不自动写模块单例，避免启动期隐式改既有空台账回退断言；运行时启动登记策略待后续集成批次书面放行。
- **A20 快照不含候选正文**：台账「产出可交 S-08 审计事件的结构化引用快照」按最小口径落地为级别 / 计数 / chunkId / 原因码 / 标记 / 时间字段；候选答案正文与患者叙述均不进入快照。
- **A16 动作枚举口径**：台账写「挂起 / 确认 / 退回」三类动作；实现按 S-05 `humanAction` 与 S-08 `AiHumanAction` 既有五值口径（adopted / modified / rejected / escalated / pending）落地，三类核心动作独立计数，枚举与既有事件链保持同构，未自行新增第六类动作。
- **既有遗留品牌字样**：`src/core/agent/SystemPromptBuilder.ts` 第 2 行头部注释存在历史遗留表述，属既有源码，按批次边界本轮未回改；本轮仅抽取 `ETHICS_LAYER_TEXT` 常量，未改动该行；新写文件头注与注释均使用合规品牌口径。
- **spec 行号锚点**：台账 §3 未给出行号的条目（A03、A34）按既有切片记录章节与 spec 小节口径引用；本记录不虚构 spec 行号。

### 6.3 未闭环声明

本批次 9 条放行清单范围内契约、单测、双 tsc 门禁、既有基线回归全部闭环；第 5 节列明的 P2 / B 类 / 阶段②③ 事项均属后续切片范围，未在本批次提前实现；不存在「现状与台账冲突但硬写通过」的条目。

## 7. 批次汇总证据索引

| 证据 | 路径 |
|---|---|
| 台账（只读参照，未回改） | `reports/slices/S-phase1-gap-inventory/gap-inventory.md` §3 |
| 根 tsc 日志 | `logs/a22-p1-tsc-root-20261027-p1.log`（0 字节）；终态复跑 `logs/a22-p1-final-tsc-root-20261027-p1.log`（0 字节） |
| web tsc 日志 | `logs/a22-p1-tsc-web-20261027-p1.log`（0 字节）；终态复跑 `logs/a22-p1-final-tsc-web-20261027-p1.log`（0 字节） |
| 本轮 10 份测试日志 | `logs/a22-p1-tests-unit-*-20261027-p1.log` |
| 26 份基线回归日志 | `logs/a22-p1-regression-*.log`；汇总 `logs/a22-p1-regression-summary.csv` |
| 文件行数 / 字节度量 | `logs/a22-p1-file-metrics.csv` |
| 品牌 / 密钥 / 占位符扫描 | `logs/a22-p1-scan-20261027-p1.log`、`logs/a22-p1-chinese-scan-20261027-p1.log` |
| 结构化批次清单 | `reports/slices/S-phase1-p1-a22-batch/batch-manifest.json` |

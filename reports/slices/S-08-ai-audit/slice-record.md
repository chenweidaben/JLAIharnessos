# S-08 切片记录：AI 审计四维留痕

- **切片编号**：S-08
- **产品口径**：健澜AI原生医院操作系统OS
- **署名**：杭州健澜科技有限公司
- **基线仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`，基线 HEAD `1d0dc546e5d32e42dc8313d4601cb09a8f72abe6`
- **实现形态**：纯类型 + 纯函数 + 进程内存台账 + 自有 SHA-256 哈希链，离线闭环；不接 DB、不发起网络请求、不调用真实 LLM；测试使用 demo 合成夹具，无院方实名、无明文端点、无密钥口令；工具输入输出只存哈希，不落原文。

## 1. 目标与契约依据

### 1.1 技术文档章节（`docs/technical/YXS20261026-development-spec-2026-10-26.md`）

| 章节 | 行号 | 落地内容 |
|---|---|---|
| 3.6.5 AI 专项审计事件与四维留痕 | 738–767 | `AiAuditEvent` 字段模型（调用者 / 智能体 / 场景 / 四维版本快照 / 脱敏摘要 / 引用 / 耗时 / 用量 / 防护级别 / 人工处置 / 工具调用 / 哈希链）；事件写入既有 `AuditLogger` 六类日志扩展域；多维检索；病历 ↔ 生成过程 ↔ 四维版本双向追溯；患者身份字段脱敏、原始标识独立存放；27 条未入链写路径分批接入本事件模型 |
| 3.6.6 验收标准（S-01、S-08、S-13 联动） | 769–772 | AI 事件字段完整入哈希链；四维版本可随病历导出；越权与阻断事件可检索；合规 P0-③ 写路径分批入链记录在案；双 tsc 零错误 |

### 1.2 差距矩阵（`docs/research/YXS20261026-gap-matrix-2026-10-26.md`）

| 编号 / 条目 | 行号 | 差距说明 | 本切片落地 |
|---|---|---|---|
| S-05 全过程审计 | 239 | 审计底座与执行轨迹具备；AI 调用专项字段（模型版本、知识版本、提示词版本、检索片段编号、采纳 / 修改 / 拒绝、人工干预点）是否全量入审计链、是否支持多维检索需复核补齐，联动 emr-gap P0-③ | `AiAuditEvent` 专项字段全集；`query` 多维 AND 组合检索；采纳 / 修改 / 拒绝 / 升级 / 待确认人工干预点留痕；引用 chunkId 列表 `citations` 入链 |
| 四维留痕 | 305 | 病历生成记录需绑定「模型版本 + 知识版本 + 提示词版本 + 发布版本」四元组并可一键导出举证链 | `AiVersionSnapshot` 四维快照逐字段留存；`exportTrace(traceId)` 返回事件序列 + 一致四维快照 + 病历引用清单 |
| P0-③ 审计 WORM / 哈希链覆盖 27 个未入链病历写路径 | 327 | AI 生成、人工修改、退回重写全部入链；27 条写路径分批排期 | 事件预留 `writePath` 字段；27 条清单照 emr-gap 原文登记为分批整改台账（见第 6 节附录），本切片不接线 |
| P0-⑥ 导出 / 批量 / 打印 / 共享出口逐字段统一脱敏拦截 | 330 | 输出侧校验器与出口脱敏形成最后两道防线 | 摘要入链前经既有脱敏引擎掩码；出口逐字段拦截归 S-08 + S-01 后续批次（见第 7 节遗留项） |
| 台账 S-08 | 353 | AI 审计链路补齐：四元组绑定、专项审计字段、多维检索、与 WORM / 哈希链接入；27 条写路径分批入链 | 内存事件台账 + 自有哈希链 + 多维检索 + trace 导出；WORM 持久化与 27 条写路径接线按台账登记分批 |

### 1.3 切片台账

- 台账 S-08（第 353 行）：模型 / 知识 / 提示词 / 发布版本四元组绑定；AI 调用专项审计字段（输入摘要 / 输出 / 模型版本 / 调用者 / 时间 / 耗时 / 采纳状态 / 人工干预点）；多维检索；与 WORM / 哈希链接入。验收口径：AI 事件入审计链并通过完整性校验；四元组可随病历记录导出；既有合规 P0-③ 27 条写路径分批入链；遗留项为 27 条写路径整改量较大，分批排期。

## 2. 输入输出契约

### 2.1 输入（本切片只读消费，不改动语义）

- 既有 `AuditLogger` / `LogContext` / `AuditEventType`（`src/security/audit/AuditLogger.ts`、`AuditEvent.ts`）：仅桥接调用，不修改签名、不新增枚举值；AI 专项分类以 `operationModule` / `parameters` 扩展域承载。
- 既有脱敏引擎 `desensitizeText`（`src/security/desensitization/`）：摘要入链前掩码，复用既有规则集（姓名 / 手机号 / 证件号 / 地址 / 银行卡 / 邮箱等）。
- 既有 `LogIntegrityManager` 创世哈希口径（`'0'.repeat(64)`）与 SHA-256 排序键 JSON 口径：本切片内存台账自有链保持同口径，不复用其实例状态。
- S-01 输出防护级别口径（PASS / CAUTION / BLOCK，`src/security/ai/outputGuard.ts`）：`guardLevel` 枚举对齐，只读引用。
- S-02 模型卡片、S-04 提示词资产版本：仅在 `versions` 快照中留存引用标识，不在本切片解析。

### 2.2 输出（本切片新增公共符号，经 `src/security/audit/index.ts` 与 `src/security/index.ts` 双桶挂接）

**类型**：`AiActor`、`AiVersionSnapshot`、`ToolCallRecord`、`AiGuardLevel`、`AiHumanAction`、`AiAuditEvent`、`AiAuditEventInput`、`AiAuditQuery`、`AiTraceExport`、`AiChainVerification`。

**常量**：`AUDIT_GENESIS_HASH`（创世哈希 `0×64`）；错误码 `AUD_ERROR_MISSING_FIELD='AUD-001'`、`AUD_ERROR_INVALID_ENUM='AUD-002'`、`AUD_ERROR_INVALID_NUMBER='AUD-003'`、`AUD_ERROR_INVALID_KNOWLEDGE_VERSIONS='AUD-004'`、`AUD_ERROR_INVALID_ACTOR='AUD-005'`、`AUD_ERROR_INVALID_VERSIONS='AUD-006'`、`AUD_ERROR_TRACE_NOT_FOUND='AUD-007'`。

**纯函数**：`validateAiAuditInput(input)`（必填 / 枚举 / 数值 / 结构校验，返回中文错误数组）；`hashToolPayload(payload)`（工具输入 / 输出内容 SHA-256 摘要，落链只存哈希）。

**类**：`AiAuditService`，方法 `record` / `query` / `exportTrace` / `linkMedicalRecord` / `getRecordRefs` / `verifyChain` / `listEvents` / `reset`。

**单例**：`getAiAuditService(options?: { logger?: AuditLogger })`、`_resetAiAuditService()`（测试重置）。

### 2.3 事件字段与服务端生成口径

| 字段 | 口径 |
|---|---|
| `eventId` / `timestamp` / `auditChain` / `patientMasked` | 服务端生成，调用方不传 |
| `actor` / `agentId` / `agentVersion` / `scenario` / `versions` / `elapsedMs` / `tokenUsage` / `guardLevel` / `humanAction` | 调用方传入，登记前经 `validateAiAuditInput` 校验 |
| `patientId` / `visitId` / `department` / `recordRef` / `writePath` / `evidence` / `citations` / `toolCalls` / `inputSummary` / `outputSummary` | 可选 / 调用方传入；摘要入库前脱敏；原始患者标识独立字段存放，不复制进摘要 |
| `versions.knowledgeVersion` | 入库前去重排序；`query` 中按包含匹配 |

### 2.4 哈希链口径

- 创世哈希：`'0'.repeat(64)`；事件体 = 除 `auditChain` 外全部字段，按键排序确定性 JSON；`hash = SHA-256(prevHash + canonicalJson)`；`prevHash` 取链尾。
- `verifyChain()` 按登记顺序重算每条事件哈希；任一 `prevHash` 断链或内容被篡改，返回 `valid=false`、`verifiedCount`、`firstInvalidIndex`（0 基）与中文原因。

## 3. 新增 / 修改文件清单（实测行数与字节）

| 操作 | 路径 | 行数 | 字节 | 说明 |
|---|---|---:|---:|---|
| 新增 | `src/security/audit/aiAudit.ts` | 501 | 21591 | 类型契约、`validateAiAuditInput`、`hashToolPayload`、`AiAuditService`（内存台账 / 脱敏入链 / 哈希链 / 多维检索 / trace 导出 / 病历引用绑定 / 桥接）、单例与错误码常量 |
| 修改 | `src/security/audit/index.ts` | 37 | 925 | 追加 `export * from './aiAudit.js'`；既有 `AuditLogger` / `AuditEventType` / `LogIntegrityManager` / `MemoryLogStorage` 等导出保持不变 |
| 修改 | `src/security/index.ts` | 241 | 5554 | 审计导出块追加本切片公共类型、`AiAuditService`、`getAiAuditService`、`_resetAiAuditService` 与错误码常量；不删除、不改名既有符号 |
| 新增 | `tests/unit/security/aiAudit.test.ts` | 410 | 18160 | bun:test 单测，7 个 describe 共 21 例 |
| 新增 | `reports/slices/S-08-ai-audit/slice-record.md` | 163 | 24161 | 本切片记录（含四维版本字段表、桥接映射表、P0-③ 27 条写路径台账附录） |

> 未改动：`src/security/audit/AuditLogger.ts`、`AuditEvent.ts`、`LogIntegrity.ts`、`LogStorage.ts`、`AuditReportGenerator.ts`、`src/security/ai/outputGuard.ts`、`src/security/desensitization/*`、`src/orchestrator/engine/recorder.ts`、既有 BFF 路由 / 页面 / 挂载 / 权限码 / 函数签名，以及 S-02 / S-03 / S-04 / S-06 全部源码与测试；未新增任何依赖。

## 4. 测试清单与结果

### 4.1 新增测试（S-08）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/security/aiAudit.test.ts` | 21 | 0 | 85 | 1087 ms | `logs/s08-audit-test-20261026-2147.log` |

覆盖用例分组：

- **入参校验**：traceId / agentId / agentVersion / scenario / actor.userId / actor.department / 四维版本必填项缺失分别拒绝且错误信息含缺失项与错误码；guardLevel / humanAction 枚举非法拒绝；elapsedMs / tokenUsage 非负校验；knowledgeVersion 非字符串数组拒绝；工具调用 riskLevel / result / durationMs 非法拒绝；校验失败不写入台账。
- **哈希链**：连续三条事件 `prevHash` 首尾相接、创世哈希为 `0×64`、`verifyChain` 全绿；篡改第二条事件输出摘要后 `valid=false`、`firstInvalidIndex=1`、原因含「第 2 条」；`reset()` 后台账清空、链尾回到创世哈希、新事件 `prevHash` 重新接创世哈希。
- **摘要脱敏**：姓名 / 手机号 / 证件号 / 地址在入库摘要中被掩码，`patientMasked=true`；原始 `patientId` / `visitId` 独立字段存放且不进入摘要文本；无敏感信息摘要保持原文、`patientMasked=false`；工具输入输出只存哈希字段、不落原文。
- **多维检索**：agentId / agentVersion / modelId / modelVersion / promptVersion 精确过滤；knowledgeVersion 包含匹配；patientId / department / scenario 精确过滤；guardLevel / humanAction 过滤（越权与阻断事件可单独按 `BLOCK` / `escalated` 检索）；from/to 时间闭区间；组合过滤；无匹配返回空数组。
- **trace 双向追溯**：同一 traceId 多事件返回一致四维快照与 recordRefs；未知 traceId 导出抛 `[AUD-007]`；`linkMedicalRecord` 追加引用、重复去重、`getRecordRefs` 回读；未知 traceId 绑定拒绝；事件自带 `recordRef` 自动纳入引用清单。
- **AuditLogger 桥接**：注入内存 `MemoryLogStorage` + 同步写 `AuditLogger`；普通事件桥接 `AGENT_DECISION`；BLOCK 事件桥接 `SEC_UNAUTHORIZED_ACCESS`；含工具调用桥接 `AGENT_TOOL_CALL`；泄露证据桥接 `SEC_DATA_LEAK_DETECTED`；工具名 / traceId / 患者标识 / 时长写入扩展字段；未注入 logger 时内存台账照常落事件、不抛错。
- **留痕字段回读**：toolCalls（含输入 / 输出哈希）、tokenUsage、citations、evidence、writePath 随事件留存回读；返回对象为深拷贝，外部修改不影响台账内部状态。

### 4.2 既有回归（数字不劣化，未修改这些测试与对应源码；2147 批次全部 exit=0）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/security/audit.test.ts` | 19 | 0 | 34 | 1153 ms | `logs/s08-regression-security-audit-20261026-2147.log` |
| `tests/unit/security/outputGuard.test.ts` | 18 | 0 | 40 | 1009 ms | `logs/s08-regression-security-outputguard-20261026-2147.log` |
| `tests/unit/bff/agents/modelRegistry.test.ts` | 36 | 0 | 106 | 958 ms | `logs/s08-regression-model-registry-20261026-2147.log` |
| `tests/unit/bff/agents/modelHealthProbe.test.ts` | 12 | 0 | 48 | 1436 ms | `logs/s08-regression-model-healthprobe-20261026-2147.log` |
| `tests/unit/bff/agents/modelRouter.test.ts` | 36 | 0 | 109 | 946 ms | `logs/s08-regression-model-router-20261026-2147.log` |
| `tests/unit/modelProvider.test.ts` | 4 | 0 | 20 | 1019 ms | `logs/s08-regression-model-provider-20261026-2147.log` |
| `tests/unit/bff/prompt/assetRegistry.test.ts` | 25 | 0 | 60 | 941 ms | `logs/s08-regression-prompt-asset-20261026-2147.log` |
| `tests/unit/bff/prompt/schemaGuard.test.ts` | 13 | 0 | 47 | 923 ms | `logs/s08-regression-prompt-schema-20261026-2147.log` |
| `tests/unit/bff/prompt/metricsAggregator.test.ts` | 8 | 0 | 24 | 950 ms | `logs/s08-regression-prompt-metrics-20261026-2147.log` |
| `tests/unit/bff/prompt/promptLoader.test.ts` | 8 | 0 | 28 | 959 ms | `logs/s08-regression-prompt-loader-20261026-2147.log` |
| `tests/unit/bff/agents/agentAdmission.test.ts` | 27 | 0 | 119 | 928 ms | `logs/s08-regression-agent-admission-20261026-2147.log` |
| `tests/unit/coordinator/AgentRegistry.test.ts` | 8 | 0 | 13 | 888 ms | `logs/s08-regression-agent-registry-20261026-2147.log` |
| `tests/unit/orchestrator/agents.load.test.ts` | 24 | 0 | 114 | 1.95 s | `logs/s08-regression-agents-load-20261026-2147.log` |
| `tests/unit/orchestrator/agents.exec.test.ts` | 3 | 0 | 10 | 1212 ms | `logs/s08-regression-agents-exec-20261026-2147.log` |
| `tests/unit/core/SystemPromptBuilder.test.ts` | 11 | 0 | 21 | 941 ms | `logs/s08-regression-core-systemprompt-20261026-2147.log` |
| `tests/unit/promptGovernanceV5.test.ts` | 5 | 0 | 7 | 916 ms | `logs/s08-regression-prompt-v5-20261026-2147.log` |

> 说明：安全域两份基线测试在 2147 批次复跑全绿，数字与基线 19/0/34、18/0/40 一致；模型域、提示词域、智能体域与核心 / 路由测试数字均未劣化；未删用例、未改既有断言换绿灯。

## 5. 双 tsc 门禁

| 门禁 | 命令（工作目录） | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit`（仓库根） | 0 | `logs/s08-tsc-root-20261026-2148.log` | 0 |
| web tsc | `bun x tsc --noEmit`（`web/` 目录） | 0 | `logs/s08-tsc-web-20261026-2148.log` | 0 |

> 过程留痕：首轮根 tsc 曾因 `AuditEventType` 误从 `./AuditLogger.js` 导入（TS2459，事件类型枚举定义于 `./AuditEvent.js`）退出码 2，日志 `logs/s08-tsc-root-20261026-2144.log`（143 字节）；修正导入路径后复跑清零，中间记录 `logs/s08-tsc-root-20261026-2145.log`、`logs/s08-tsc-web-20261026-2145.log`（均 0 字节）；最终门禁以 2148 两份 0 字节日志为准。

## 6. 附录

### 6.1 四维版本字段表（3.6.5 第 746–751 行 / 差距矩阵 305 行）

| 维度 | 事件字段 | 取值口径 | 台账联动 |
|---|---|---|---|
| 模型 | `versions.modelId` | 模型卡片标识（S-02 引用标识，不在本切片解析） | S-02 模型注册表 / S-03 策略路由规则 |
| 模型版本 | `versions.modelVersion` | 模型版本号字符串 | S-02 模型卡片版本字段 |
| 知识 | `versions.knowledgeVersion[]` | 知识数据集版本清单；入库前去重排序；`query` 按包含匹配 | S-04 知识资产版本 / 后续 S-12 引用编号协议 |
| 提示词 | `versions.promptVersion` | 提示词资产版本引用 | S-04 提示词四层资产 `version` |
| 平台发布 | `versions.platformRelease` | 平台发布版本号 | S-07 版本升级台账 |

> 导出举证链：`exportTrace(traceId)` 返回同一 traceId 全部事件、首事件四维快照与去重 `recordRefs` 清单；病历记录经 `linkMedicalRecord(traceId, recordRef)` 双向绑定，实现「病历 ↔ 生成过程 ↔ 四维版本」追溯。

### 6.2 既有 AuditLogger 桥接映射表（3.6.5 第 763 行；不新增 `AuditEventType` 枚举值）

| AI 事件判定条件 | 桥接 `AuditEventType` | `LogContext` 映射 | `details` 扩展字段 |
|---|---|---|---|
| `toolCalls.length > 0` | `AGENT_TOOL_CALL` | `userId=actor.userId`；`userName=actor.userId`；`userRole=actor.roleCodes.join(',')`；`userDepartment=actor.department`；`sessionId=traceId`；`clientIp='ai-audit-internal'` | `agentId`、`agentType=agentVersion`、`knowledgeRefs=knowledgeVersion`、`toolName=toolCalls[0].toolId`、`patientId`、`durationMs=elapsedMs`、`traceId`、`parameters{scenario, guardLevel, humanAction, citations, evidence}` |
| `guardLevel='BLOCK'`（无工具调用） | `UNAUTHORIZED_ACCESS`（`SEC_UNAUTHORIZED_ACCESS`） | 同上 | 同上 |
| `evidence` 命中「泄露 / leak」关键词（无工具调用、非 BLOCK） | `DATA_LEAK_DETECTED`（`SEC_DATA_LEAK`） | 同上 | 同上 |
| 其余普通生成决策 | `AGENT_DECISION` | 同上 | 同上 |

> 桥接为旁路增强：logger 未注入时跳过桥接、内存台账照常落事件；桥接调用整体 `try/catch` 包裹，写入失败不抛出、不阻断主流程，口径与既有 `AuditLogger` 异步失败处理一致。

### 6.3 P0-③ 27 条未入链写路径分批整改台账（照 `docs/research/emr-gap-matrix-2026-10-25.md` 第 179 行原文登记，本切片只登记不接线）

**现状证据**：主操作日志 `src/bff/middleware/audit.ts:33-46` 建 `audit.operation_log`，无 `prev_hash`、无链；哈希链仓储 `src/db/repositories/auditChainRepo.ts:41-111` 写 `audit.audit_logs`，链由 BEFORE INSERT 触发器维护；本轮 Grep `src/bff/aggregators/` 共 75 个聚合器调用 `recordChainAudit`。下表 27 个聚合器实测 `chain=0 / repoRef` 计数，本切片事件模型已预留 `writePath` 字段承载路径标识，真实入链接线归 P0-③ 后续批次（S-05 / S-08 后续）。

| # | 写路径聚合器 | chain=0 / repoRef | 本切片预留字段 | 批次建议 |
|---:|---|:---:|---|---|
| 1 | `admissionNoteAggregator` | 0 / 1 | `writePath` | 第一批：入院 / 病程 / 手术 / 护理核心病历写路径 |
| 2 | `progressNoteAggregator` | 0 / 1 | `writePath` | 第一批 |
| 3 | `surgeryRecordAggregator` | 0 / 1 | `writePath` | 第一批 |
| 4 | `nursingRecordAggregator` | 0 / 1 | `writePath` | 第一批 |
| 5 | `medicalHeaderAggregator` | 0 / 1 | `writePath` | 第一批 |
| 6 | `dischargeSummaryAggregator` | 0 / 1 | `writePath` | 第一批 |
| 7 | `consentFormAggregator` | 0 / 1 | `writePath` | 第一批 |
| 8 | `orderAggregator` | 0 / 1 | `writePath` | 第一批 |
| 9 | `medicalQcAggregator` | 0 / 2 | `writePath` | 第二批：病历质控 / 终末质控 / 整改 / 时限 |
| 10 | `terminalQcAggregator` | 0 / 14 | `writePath` | 第二批 |
| 11 | `qcRectificationAggregator` | 0 / 2 | `writePath` | 第二批 |
| 12 | `timelinessAggregator` | 0 / 1 | `writePath` | 第二批 |
| 13 | `medicalArchiveAggregator` | 0 / 1 | `writePath` | 第三批：归档 / 复印 / 解读 / 出院计划 |
| 14 | `medicalCopyAggregator` | 0 / 1 | `writePath` | 第三批 |
| 15 | `labInterpretAggregator` | 0 / 1 | `writePath` | 第三批 |
| 16 | `imagingInterpretAggregator` | 0 / 1 | `writePath` | 第三批 |
| 17 | `dischargePlanAggregator` | 0 / 3 | `writePath` | 第三批 |
| 18 | `emrTemplateAggregator` | 0 / 0 | `writePath` | 第四批：模板 / 临床路径 / 签名 / 评估评分 |
| 19 | `clinicalPathwayAggregator` | 0 / 0 | `writePath` | 第四批 |
| 20 | `eSignatureAggregator` | 0 / 0 | `writePath` | 第四批 |
| 21 | `emrAssessmentAggregator` | 0 / 2 | `writePath` | 第四批 |
| 22 | `emrGrade5Aggregator` | 0 / 0 | `writePath` | 第四批 |
| 23 | `emrLevel5Aggregator` | 0 / 0 | `writePath` | 第四批 |
| 24 | `emrSmartScoreAggregator` | 0 / 0 | `writePath` | 第四批 |
| 25 | `nursingRiskPatternAggregator` | 0 / 0 | `writePath` | 第四批 |
| 26 | `medicalRecordDeepAggregator` | 0 / 0 | `writePath` | 第四批 |
| 27 | `outpatientAggregator` | 0 / 8 | `writePath` | 第四批 |

**口径区分（照原文登记，避免误并）**：`rectificationAggregator.ts`（chain=4、repoRef=3）与 `qcRectificationAggregator.ts`（chain=0、repoRef=2）为两个不同文件；`frontPageAggregator.ts`（chain=5、repoRef=5）已入链，不在本清单。

**接线方向（照 emr-gap 第 190 行登记，不在本切片实施）**：在状态迁移与快照写入同事务内调用 `recordChainAudit`，动作类型覆盖创建 / 提交 / 审核 / 签名 / 退回 / 归档 / 封存 / 借阅 / 复印 / 注销；AI 生成、人工修改、退回重写全部入链；主操作日志补链列与触发器方向、应用角色 + 数据库角色分层落地 UPDATE / DELETE 权限回收（WORM）、周期 `verify_chain()` 断裂告警、导出审计记录附链校验结果，归后续合规批次。

## 7. 遗留风险与后续建议

### 7.1 本切片已预留但未闭环项（不谎称通过）

1. **27 条病历写路径真实入链（P0-③，台账 327 行）**：本切片仅形成分批台账与事件 `writePath` 预留字段；27 个聚合器在状态迁移 / 快照写入事务内接入审计链的接线工作归 P0-③ 后续批次（S-05 / S-08 后续），当前不产生任何 DB 读写。
2. **WORM 持久化落库**：本切片为进程内存台账 + 内存哈希链；事件持久化到既有 `FileWormStorage` 口径或 DB `audit.audit_logs` 链表、周期链校验与断裂告警归后续合规批次；存储接口方向已由既有 `IWormStorage` / `LogIntegrityManager` 预留。
3. **真实 RBAC 越权拦截（P0-①，S-13）**：本切片仅记录 `actor`（userId / roleCodes / department）与患者标识字段，不执行权限判定；越权访问拦截、患者级数据范围过滤归 S-13 与合规切片。
4. **出口逐字段脱敏拦截（P0-⑥，330 行）**：本切片完成摘要入链前脱敏；导出 / 批量 / 打印 / 共享出口的逐字段统一脱敏拦截由 S-08 + S-01 后续批次联动落地，形成输出侧校验 + 出口脱敏两道防线。
5. **编排记录器对接**：`src/orchestrator/engine/recorder.ts` 既有事件流未改动；AI 事件从编排节点批量入审计台账的适配器对接归 S-05 / S-08 后续批次，本切片仅提供 `record(input)` 同步入口。
6. **语义级事实一致性比对**：本切片不做幻觉 / 事实矛盾语义判定；S-01 确定性规则集覆盖红线表述，语义级比对归后续切片。
7. **四元组强绑定校验**：`exportTrace` 已提供举证链导出接口；`modelId / modelVersion / knowledgeVersion / promptVersion / platformRelease` 与 S-02 模型卡片、S-04 提示词资产、S-07 版本台账的一致性校验与发布时点绑定，归 S-11 联调批次。
8. **BFF 审计路由与前端看板**：本切片只落后端内存模块与单测；多维检索 HTTP 接口、审计看板、trace 导出页面归后续 BFF / 前端批次。

### 7.2 对 S-11（版本台账与联调）的建议接口预留

- `AiVersionSnapshot` 四字段可直接挂接 S-07 四线版本台账（平台程序 / 模型 / 知识 / 提示词）；建议 S-11 在发布事件落库时校验四元组与当前台账一致，导出审计记录附 `verifyChain()` 校验结果。
- `citations`（chunkId 列表）与 `evidence`（证据片段引用）已按 S-01 输出校验口径留存；S-12 引用编号协议落地后可将引用清单升级为结构化「待核实」字段。
- `writePath` 字段已按聚合器路径标识预留，27 条写路径接线时直接映射 6.3 台账行号。

### 7.3 对 S-13（RBAC 与数据范围）的建议接口预留

- `AiActor.roleCodes` / `department` 已按 RBAC 上下文结构建模；建议 S-13 接入真实会话身份替换 demo 夹具，越权事件直接桥接 `SEC_UNAUTHORIZED_ACCESS` 并独立告警。
- `patientId` / `visitId` / `department` 为独立检索字段；建议 S-13 检索层叠加患者级数据范围过滤，审计摘要仅经授权数据范围可查（3.6.5 第 767 行口径）。

### 7.4 工程自检记录

- TypeScript strict、ESM、`@/*` 别名 + `.js` 后缀；未新增依赖（仅使用已装 `node:crypto` 与既有脱敏 / 审计模块）。
- 本地开发态未执行 `git add / commit / push / tag`；未删除用户源码；未移动 / 重命名既有文件；未清理历史 backlog；未改动未点名既有路由 / 页面 / 挂载 / 权限码 / 函数签名。
- 代码 / 测试 / 日志 / 文档无真实密码、token、密钥与明文端点；测试夹具为合成演示数据，无院方实名；日志不含大段患者文本；工具输入输出只存哈希。

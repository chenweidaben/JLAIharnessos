# S-13 切片记录：患者级隔离索引与越权审计

- **切片编号**：S-13
- **产品口径**：健澜AI原生医院操作系统OS
- **署名**：杭州健澜科技有限公司
- **基线仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`，基线 HEAD `1d0dc546e5d32e42dc8313d4601cb09a8f72abe6`
- **实现形态**：纯类型 + 纯函数 + 进程内存台账，离线闭环；不接 DB、不发起网络请求、不调用真实 LLM 与向量相似度；测试使用 demo 合成夹具，无院方实名、无明文端点、无密钥口令。

## 1. 目标与契约依据

### 1.1 技术文档章节（`docs/technical/YXS20261026-development-spec-2026-10-26.md`）

| 章节 | 行号 | 落地内容 |
|---|---|---|
| 3.3.2 患者级隔离索引 | 373–388 | `SimilarCaseIndex` 结构、`scope='patient-isolated'`、`partitionKey`、`accessRule` 三字段；接入校验 IngestGuard；归档后批量任务构建；工具节点强制携带 `patientId/visitId`；越权检索写审计并告警 |
| 3.3.6 验收标准（S-11、S-12、S-13） | 444–446 | 跨患者检索被拒绝；越权调用入审计；既有知识中台测试不回归 |
| ADR-03 | 125 | 患者诊疗数据禁止进入向量库；患者实时信息由工具节点按就诊标识从业务系统实时获取；历史相似病例另建患者级隔离索引（关联 S-13、S-12） |
| 台账 S-13 验收口径 | 1418 | 「患者级隔离索引与强制过滤、越权测试；跨患者检索拒绝；越权事件入审计」 |

### 1.2 差距矩阵（`docs/research/YXS20261026-gap-matrix-2026-10-26.md`）

| 编号 | 行号 | 差距说明 | 本切片落地 |
|---|---|---|---|
| R-08 | 202 | 当前无患者级隔离索引；相似病例检索必须强制患者标识过滤、禁止跨患者召回；患者诊疗数据不入向量库需在类型与接入校验显式禁止 | 落地 `SimilarCaseIndex` / `SimilarCaseChunk` 类型模型、`IngestGuard` 接入校验、分区强制过滤服务、越权阻断审计入链与多维回查；工具节点强制携带标识、实时取数与归档任务调度归后续批次 |
| 台账 S-13 | 358 | 相似病例患者级隔离索引；强制就诊 / 患者标识过滤；跨患者召回禁止；患者诊疗数据禁入向量库的类型与接入校验；越权调用审计测试 | 本切片交付类型契约、归档构建、校验纯函数、隔离服务与 33 例离线单测；运行时接线见第 7 节遗留风险 |

### 1.3 切片边界（本切片明确不做）

- 真实归档批量任务调度与定时构建；
- 真实向量相似度打分与 `hybrid.ts` 召回链路接线；
- RBAC 会话上下文真实解析（角色由调用方在查询入参传入，校验口径在本切片固化）；
- BFF 路由、前端相似病例页面；持久化落库；
- 患者文档实时取数工具节点改造；
- 通用知识库接入器改造（IngestGuard 仅提供纯函数校验与拒绝语义，不挂接既有接入器链路）。

## 2. 输入输出契约

### 2.1 输入（本切片只读复用，不改动语义）

- `AiActor { userId; roleCodes; department }`、`AiVersionSnapshot { modelId; modelVersion; knowledgeVersion: string[]; promptVersion; platformRelease }`、`AiAuditEventInput`、`AiAuditEvent`、`AiAuditQuery`、`AiAuditService`（`src/security/audit/aiAudit.ts`）：类型 `import type` 复用；`record` / `query` 签名与 S-08 桥接映射不改动；`guardLevel='BLOCK'` 沿用既有 `UNAUTHORIZED_ACCESS` 桥接口径。
- `SourceProvenance`（`src/knowledge-platform/types.ts`）：复用既有溯源结构；新隔离类型与既有 `RetrievalHit` 并存，不回改既有接口。
- S-11 患者标识污染字段清单（`patientId / visitId / partitionKey / patientScopeId / medicalRecordNo`）：IngestGuard 字段清单与之对齐，独立实现、不反向依赖 lifecycle 模块内部常量。
- S-12 `Citation` / `CitationHit` 为通用问答协议；相似病例命中结构另立 `SimilarCaseChunk`，不与通用 `CitationHit` 混用。

### 2.2 输出（本切片新增公共符号，经 `src/knowledge-platform/isolation/index.ts` 与 `src/knowledge-platform/index.ts` 双桶挂接）

**类型**：`SimilarCaseChunk`、`SimilarCaseAccessRule`、`SimilarCaseIndex`、`IsolationQuery`、`IsolationReasonCode`、`IsolationVerdict`、`IngestGuardReasonCode`、`IngestGuardVerdict`、`PatientDocumentPayload`。

**常量**：`ISO_ERROR_MISSING_FIELD='ISO-001'`、`ISO_ERROR_INVALID_RULE='ISO-002'`、`ISO_ERROR_PARTITION_MISMATCH='ISO-003'`、`ISO_ERROR_DEIDENTIFICATION='ISO-004'`、`ISO_ERROR_ARCHIVAL_ONLY='ISO-005'`、`ISO_ERROR_NOT_FOUND='ISO-006'`；`ISOLATION_SCENARIO='similar-case-isolation'`、`ISOLATION_WRITE_PATH='patient-isolation/query'`、`ISOLATION_TOOL_ID='similar-case-query'`。

**纯函数**：`validateSimilarCaseIndex`、`assertNotPatientDocument`、`buildArchivalIndex`。

**服务**：`PatientIsolationService`（`registerIndex` / `getIndex` / `querySimilarCases` / `listBlockedQueries` / `reset`）；模块级单例 `getPatientIsolationService(options?)` 与 `_resetPatientIsolationService()`。

### 2.3 协议类型字段表（对齐 3.3.2 第 376–385 行原文）

**`SimilarCaseChunk`（历史已归档、经脱敏与授权的相似病例片段）**

| 字段 | 类型 | 口径 |
|---|---|---|
| `chunkId` | `string` | 片段唯一标识 |
| `patientId` | `string` | 归属患者；必须等于所在索引 `partitionKey` |
| `visitId?` | `string` | 就诊标识；查询携带 `visitId` 时强制相等 |
| `excerpt` | `string` | 脱敏片段文本；禁止残留手机号 / 身份证号 / 姓名前缀 |
| `sectionTitle?` | `string` | 章节标题 |
| `specialty?` | `string` | 专科 |
| `archivedAt` | `string` | 归档时间 ISO8601，须为合法日期 |
| `deidentified` | `true` | 脱敏完成标记，字面量恒为 `true` |
| `authorizedScope` | `string[]` | 授权使用范围角色清单 |
| `provenance` | `SourceProvenance` | 既有溯源结构，`sourceName` 必填 |
| `conflictGroup?` | `string` | 冲突分组，预留跨文档归并 |

**`SimilarCaseAccessRule`（访问规则）**

| 字段 | 类型 | 口径 |
|---|---|---|
| `requireVisitMatch` | `true` | 强制就诊 / 患者标识匹配，构造期校验不可改写 |
| `allowedRoles` | `string[]` | 授权角色清单，非空 |
| `purpose` | `'similar-case-only'` | 用途仅限相似病例 |

**`SimilarCaseIndex`（患者级隔离索引，独立于通用知识库）**

| 字段 | 类型 | 口径 |
|---|---|---|
| `scope` | `'patient-isolated'` | 隔离域标识，禁止与通用知识库混用 |
| `partitionKey` | `string` | 分区键（患者标识），非空 |
| `chunks` | `SimilarCaseChunk[]` | 分区内片段集合 |
| `accessRule` | `SimilarCaseAccessRule` | 访问规则三字段 |
| `createdAt` | `string` | 构建时间 ISO8601 |
| `builtBy` | `'archival-batch'` | 仅归档后批量任务可构建 |

**`IsolationQuery`（隔离查询入参；RBAC 会话真实解析归后续批次）**

| 字段 | 类型 | 口径 |
|---|---|---|
| `traceId` | `string` | 审计链路追踪号，透传 S-08 事件 `traceId` |
| `actor` | `AiActor` | 操作者身份，透传 S-08 事件 `actor` |
| `patientId` | `string` | 查询患者标识；必填，缺失即阻断 |
| `visitId?` | `string` | 就诊标识；提供时强制匹配 |
| `roles` | `string[]` | 调用方传入角色；与 `allowedRoles` 求交集 |
| `purpose` | `string` | 调用用途；必须等于 `similar-case-only` |
| `agentId` / `agentVersion` | `string` | 智能体标识与版本，透传审计 |
| `versions` | `AiVersionSnapshot` | 四维版本快照，原样透传 S-08 |
| `queryText` | `string` | 查询文本；不落入审计摘要（摘要仅记录场景与角色） |

**`IsolationVerdict`**：`allowed: boolean`；`reasonCode: IsolationReasonCode`；`reason: string`；`hits: SimilarCaseChunk[]`（阻断恒为空数组）；`auditEventId?: string`。

**`IngestGuardVerdict`**：`allowed: boolean`；`reasonCode: 'OK' | 'PATIENT_DATA_BLOCKED'`；`reason: string`；`blockedFields: string[]`。

### 2.4 判定顺序表（`querySimilarCases`；任一不通过即返回阻断 verdict，不泄露其他分区任何片段）

| 序号 | 判定 | 不通过结论码 | 阻断口径 |
|---:|---|---|---|
| 1 | `patientId` 为空 | `MISSING_PATIENT_ID` | 相似病例检索必须携带患者标识 |
| 2 | `purpose !== 'similar-case-only'` | `PURPOSE_FORBIDDEN` | 非相似病例专属用途禁止调用隔离索引 |
| 3 | 按 `partitionKey=patientId` 取索引，不存在 | `INDEX_NOT_FOUND` | 禁止跨患者检索其他分区 |
| 4 | `roles` 与 `allowedRoles` 无交集 | `ROLE_FORBIDDEN` | 角色不在授权清单 |
| 5 | 提供 `visitId` 时分区内无相等就诊标识片段 | `VISIT_MISMATCH` | 禁止跨就诊召回 |
| 6 | 运行时兜底：分区内 `chunk.patientId` 与查询不一致 | `CHUNK_OUTSIDE_PARTITION` | 构造期已约束，台账被旁路改写时兜底阻断 |
| 7 | 全部通过 | `OK` | 返回分区内匹配片段深拷贝；不做相似度打分（真实向量打分归后续批次） |

### 2.5 审计事件映射表（复用 S-08 `AiAuditService`，旁路增强、未注入不抛错）

| 事件口径 | 阻断分支 | 放行分支 |
|---|---|---|
| `scenario` | `similar-case-isolation` | `similar-case-isolation` |
| `writePath` | `patient-isolation/query` | `patient-isolation/query` |
| `guardLevel` | `BLOCK` | `PASS` |
| `humanAction` | `pending` | `pending` |
| `evidence` | 原因码 + 阻断原因中文 | `allowed: N hits` |
| `patientId` / `visitId` | 独立字段透传查询入参 | 独立字段透传查询入参 |
| `inputSummary` | 脱敏后的场景摘要（用途、角色；不含患者正文） | 同左口径 |
| `outputSummary` | `无命中返回；阻断事件入审计链。` | 仅记录命中 chunk 数量，不落片段原文 |
| `citations` | `[]` | `[]` |
| `toolCalls` | 工具节点 `similar-case-query`，`result='blocked'` | 同节点，`result='success'` |
| `versions` | 查询入参四维快照原样透传 | 同左 |
| `elapsedMs` | 服务内时间戳差值 | 同左 |
| `tokenUsage` | `{ input: 0, output: 0 }` | `{ input: 0, output: 0 }` |
| 审计服务未注入 | 阻断语义照常返回、不抛错，`auditEventId` 为空 | 放行语义照常返回、不抛错，`auditEventId` 为空 |

### 2.6 IngestGuard 拦截字段表（ADR-03：患者诊疗数据禁止进入向量库 / 通用知识库）

| 拦截位置 | 字段名 | 拦截条件 |
|---|---|---|
| 载荷顶层 | `patientId` | 非空字符串即拦截 |
| 载荷顶层 | `visitId` | 非空字符串即拦截 |
| 载荷顶层 | `medicalRecordNo` | 非空字符串即拦截 |
| 载荷顶层 | `patientScopeId` | 非空字符串即拦截 |
| 载荷顶层 | `partitionKey` | 非空字符串即拦截 |
| `metadata` 同名键 | `patientId` / `visitId` / `medicalRecordNo` / `patientScopeId` / `partitionKey` | `metadata` 中携带同名非空键即拦截，拦截字段记为 `metadata.<字段名>` |

清洁元数据（仅公开标签、公开来源等非患者标识字段）返回 `allowed=true`；纯函数不抛错、不写台账，由接入器调用方据此拒绝入库。

## 3. 新增 / 修改文件清单（实测行数与字节）

| 操作 | 路径 | 行数 | 字节 | 说明 |
|---|---|---:|---:|---|
| 新增 | `src/knowledge-platform/isolation/patientIsolation.ts` | 517 | 21171 | 隔离类型契约、错误码常量、索引校验纯函数、IngestGuard、归档构建、`PatientIsolationService` 判定 / 审计入链 / 阻断回查、模块级单例与重置 |
| 新增 | `src/knowledge-platform/isolation/index.ts` | 9 | 274 | `export * from './patientIsolation.js'` |
| 修改 | `src/knowledge-platform/index.ts` | 52 | 2185 | 末尾追加 `export * from './isolation'`；既有 13 条导出、S-11 `export * from './lifecycle'`、S-12 `export * from './citation'` 行与 `MEDICAL_DISCLAIMER` 原位保留 |
| 新增 | `tests/unit/knowledge-platform/isolation/patientIsolation.test.ts` | 532 | 22144 | bun:test 单测，8 个 describe 共 33 例 |
| 新增 | `reports/slices/S-13-patient-isolation/slice-record.md` | 260 | 23754 | 切片记录（类型字段表、判定顺序表、审计映射表、IngestGuard 字段表、遗留风险与后续建议） |

> 未改动：`src/knowledge-platform/types.ts`、`retrieval/hybrid.ts`、S-11 lifecycle 模块、S-12 citation 模块、`src/security/audit/aiAudit.ts`、`src/security/ai/outputGuard.ts`、`src/knowledge/` 运行时全部源码、14 份既有回归测试，以及 S-02 / S-03 / S-04 / S-06 / S-08 / S-11 / S-12 全部源码与测试；未新增任何依赖。

## 4. 测试清单与结果

### 4.1 新增测试（S-13）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/knowledge-platform/isolation/patientIsolation.test.ts` | 33 | 0 | 98 | 948 ms | `logs/s13-isolation-test-20261026-2236.log` |

覆盖用例分组：

- **索引注册校验**：合法归档索引注册成功可回读；`scope` 非法、`builtBy` 非 `archival-batch`、`requireVisitMatch` 非 `true`、`purpose` 非 `similar-case-only`、`allowedRoles` 空、chunk `patientId` 与 `partitionKey` 不一致、`deidentified=false`、`archivedAt` 非法日期、`excerpt` 含 11 位手机号 / 18 位身份证号、`provenance.sourceName` 缺失分别拒绝且错误信息含字段名；重复 `partitionKey` 拒绝（ISO-003）。
- **归档批量构建**：`buildArchivalIndex` 产出 `builtBy='archival-batch'`、合法 `createdAt` 与三字段访问规则；chunk 跨分区拒绝（ISO-003）。
- **IngestGuard**：`patientId / visitId / medicalRecordNo / patientScopeId / partitionKey` 与 `metadata` 同名键分别拦截并列出 `blockedFields`；清洁元数据与空载荷放行。
- **隔离查询放行**：同患者、角色命中、用途正确、就诊匹配 → `allowed=true`；返回片段深拷贝，外部修改不影响台账；审计服务收到一条 `PASS` 事件，`toolCalls` 记 `success`，`outputSummary` 仅含命中数量、不落片段原文。
- **越权阻断**：缺 `patientId` → `MISSING_PATIENT_ID`；`purpose` 非 `similar-case-only` → `PURPOSE_FORBIDDEN`；角色无交集 → `ROLE_FORBIDDEN`；分区不存在 → `INDEX_NOT_FOUND`；`visitId` 不匹配 → `VISIT_MISMATCH`；各分支 `hits=[]`、`allowed=false`、写入 `BLOCK` 审计事件（`scenario='similar-case-isolation'`、`writePath='patient-isolation/query'`、`evidence` 含原因码）；阻断事件可按 `patientId` / `traceId` / 时间窗回查。
- **跨患者隔离**：A 患者分区存在时 B 患者查询命中 `INDEX_NOT_FOUND`，`hits` 为空且不含 A 患者任何 chunk 标识；同分区多就诊片段下 `visitId` 匹配仅返回对应就诊片段。
- **审计旁路**：未注入审计服务时阻断 / 放行语义照常、不抛错，`listBlockedQueries` 返回空；注入内存 `AiAuditService` 后事件可经 `query` 按场景 / 级别 / 患者 / 追踪号多维检索；S-08 既有校验拒绝缺字段事件，本切片不绕过入参校验。
- **深拷贝与重置**：`getIndex` 返回深拷贝，外部改写不影响台账；`reset()` 后台账清空；模块级单例可经 `_resetPatientIsolationService()` 重建，审计事件台账由 S-08 `_resetAiAuditService()` 配合重置。

### 4.2 既有回归（2238 批次全部 exit=0，数字与基线逐项一致，未修改这些测试与对应源码）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/knowledge-platform/citation/citationProtocol.test.ts` | 27 | 0 | 80 | 961 ms | `logs/s13-regression-tests-unit-knowledge-platform-citation-citationProtocol-20261026-2238.log` |
| `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts` | 24 | 0 | 90 | 923 ms | `logs/s13-regression-tests-unit-knowledge-platform-lifecycle-knowledgeRegistry-20261026-2238.log` |
| `tests/unit/orchestrator/engine.test.ts` | 16 | 0 | 36 | 1035 ms | `logs/s13-regression-tests-unit-orchestrator-engine-20261026-2238.log` |
| `tests/unit/orchestrator/e2e.test.ts` | 2 | 0 | 8 | 1072 ms | `logs/s13-regression-tests-unit-orchestrator-e2e-20261026-2238.log` |
| `tests/unit/ragTuningV5.test.ts` | 5 | 0 | 8 | 927 ms | `logs/s13-regression-tests-unit-ragTuningV5-20261026-2238.log` |
| `tests/unit/knowledge/KnowledgeBaseManager.test.ts` | 6 | 0 | 15 | 919 ms | `logs/s13-regression-tests-unit-knowledge-KnowledgeBaseManager-20261026-2238.log` |
| `tests/unit/knowledge/RetrievalEngine.test.ts` | 9 | 0 | 21 | 928 ms | `logs/s13-regression-tests-unit-knowledge-RetrievalEngine-20261026-2238.log` |
| `tests/unit/knowledge/TextSplitter.test.ts` | 10 | 0 | 27 | 901 ms | `logs/s13-regression-tests-unit-knowledge-TextSplitter-20261026-2238.log` |
| `tests/unit/knowledge/VectorStore.test.ts` | 14 | 0 | 17 | 941 ms | `logs/s13-regression-tests-unit-knowledge-VectorStore-20261026-2238.log` |
| `tests/unit/knowledge/searchMedicalKnowledge.test.ts` | 9 | 0 | 23 | 1086 ms | `logs/s13-regression-tests-unit-knowledge-searchMedicalKnowledge-20261026-2238.log` |
| `tests/unit/knowledge/medicalRecordQc.test.ts` | 12 | 0 | 29 | 998 ms | `logs/s13-regression-tests-unit-knowledge-medicalRecordQc-20261026-2238.log` |
| `tests/unit/security/audit.test.ts` | 19 | 0 | 34 | 1086 ms | `logs/s13-regression-tests-unit-security-audit-20261026-2238.log` |
| `tests/unit/security/outputGuard.test.ts` | 18 | 0 | 40 | 956 ms | `logs/s13-regression-tests-unit-security-outputGuard-20261026-2238.log` |
| `tests/unit/security/aiAudit.test.ts` | 21 | 0 | 85 | 956 ms | `logs/s13-regression-tests-unit-security-aiAudit-20261026-2238.log` |

> 说明：S-12 citation、S-11 lifecycle、3 份编排测试、6 份 `tests/unit/knowledge/` 测试与 3 份安全域测试复跑数字与基线逐项一致；桶文件追加 `export * from './isolation'` 未造成类型或行为回归；未删用例、未改既有断言换绿灯。

## 5. 双 tsc 门禁与过程留痕

| 门禁 | 命令（工作目录） | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit`（仓库根） | 0 | `logs/s13-tsc-root-20261026-2237.log` | 0 |
| web tsc | `bun x tsc --noEmit`（`web/` 目录） | 0 | `logs/s13-tsc-web-20261026-2237.log` | 0 |

**过程修复留痕（失败批次日志，仅记录过程，不作为交付门禁证据）**：

1. `logs/s13-tsc-root-20261026-2234.log`（exit 2）：测试夹具对字面量窄化字段（`scope` / `builtBy` / `requireVisitMatch` / `purpose`）直接 `as Partial<SimilarCaseIndex>` 触发 TS2352；改为 `as unknown as Partial<SimilarCaseIndex>`，缺字段审计入参改为 `as unknown as AiAuditEventInput`。
2. `logs/s13-tsc-root-20261026-2235.log`（exit 2）：`deidentified` 字面量赋值与事件入参缺 `actor` 两处剩余窄化转换错误，按 `as unknown` 两层转换修复。
3. `logs/s13-tsc-root-20261026-2236.log`（exit 0）：根 tsc 清零；新测试首轮 32 pass / 1 fail，身份证号片段先被手机号正则抢先命中，修复 `detectIdentityLeak` 判定顺序（身份证号 → 手机号 → 姓名前缀）。
4. `logs/s13-isolation-test-20261026-2236.log`：修复后 33 pass / 0 fail / 98 expect；最终根 / web tsc 以 2237 批次 0 字节日志为准。

## 6. 协议层与既有模块对接口径

### 6.1 与 S-11 生命周期条目的边界

- S-11 通用知识库条目 `patientScope='none'`，患者标识污染字段禁入通用台账；S-13 `SimilarCaseIndex` 为独立患者级分区模型，不复用 `KnowledgeBaseMeta` / `KnowledgeEntry` 结构。
- IngestGuard 字段清单与 S-11 污染清单逐项对齐；字段常量在本切片独立声明，未反向 import lifecycle 模块内部常量，避免通用知识库与隔离索引形成运行时耦合。

### 6.2 与 S-12 引用协议的边界

- S-12 `CitationHit` / `Citation` 服务于通用问答引用编号与弹窗；相似病例命中使用 `SimilarCaseChunk`，不向通用 `CitationHit` 写入 `patientId / visitId` 隔离字段。
- 后续 BFF 装配相似病例引用弹窗时，可由 `SimilarCaseChunk` 显式映射为 S-12 `Citation` 结构，映射层归入后续接线批次。

### 6.3 与 S-08 审计服务的分工

- 本切片仅构造 `AiAuditEventInput` 并调用 `record` / `query`；事件校验、脱敏、哈希链、`UNAUTHORIZED_ACCESS` 桥接全部沿用 S-08 既有实现，未改动其签名与桥接映射。
- 审计服务未注入时隔离判定主流程不受影响（旁路增强口径）；`record` 入参缺字段由 S-08 既有校验拒绝，本切片不绕过。

## 7. 遗留风险与后续建议

### 7.1 本切片已预留但未闭环项（不谎称通过）

1. **真实归档批量任务调度**：`buildArchivalIndex` 为离线纯函数；定时归档任务、院方业务系统历史病例抽取、归档审核流程归后续数据接入批次。
2. **真实向量相似度打分与 hybrid 召回接线（R-06 后续）**：本切片 `querySimilarCases` 返回分区内全部匹配片段，不计算相关度分值；向量路 / 关键词路召回、规则重排与 `hybrid.ts` 运行时接线归后续检索服务批次。
3. **RBAC 会话上下文真实解析**：`roles` 由调用方在 `IsolationQuery.roles` 传入；会话身份、角色权限映射与组织架构解析归 BFF 鉴权中间件后续批次。
4. **BFF 路由与前端相似病例页面**：本切片不提供 HTTP 路由、不写前端文件；相似病例查询接口、命中列表、越权提示与审计告警页面归前后端联调批次。
5. **持久化落库**：隔离索引为进程内存 `Map`；分区台账、归档快照与审计事件持久化归后续数据层批次。
6. **患者文档实时取数工具节点改造（ADR-03）**：实时信息由工具节点按就诊标识从业务系统实时获取的节点实现归 S-05 编排节点接线批次；本切片仅固化类型约束与隔离判定口径。
7. **通用知识库接入器改造**：IngestGuard 仅提供纯函数校验与拒绝语义；既有接入器链路挂载、拒绝响应码与接入日志归后续接入器改造批次。

### 7.2 对后续切片的建议

- **S-05 编排节点接线**：新增 `similar-case-query` 工具节点时，强制从会话上下文与查询参数绑定 `patientId / visitId`，未携带标识直接走 `MISSING_PATIENT_ID` 阻断分支；节点输出结构复用 `IsolationVerdict`，`hits` 仅向授权角色暴露脱敏片段。
- **BFF 路由**：隔离查询接口先校验会话角色与 `purpose` 入参，再调用 `PatientIsolationService.querySimilarCases`；阻断结论回传 `reasonCode` 供前端展示，审计事件经 S-08 链路上报。
- **前端相似病例页**：复用 S-12 `CitationPopupData` 映射口径展示片段出处；患者标识与就诊信息按最小化原则展示，不落原始病历全文。
- **归档批量任务**：接入业务系统后补充归档审核、脱敏复核与 `archivedAt` 一致性校验；分区索引构建失败应阻断入库而非降级写入通用知识库。

### 7.3 工程自检记录

- TypeScript strict、ESM、`@/*` 别名 + `.js` 后缀；未新增依赖（仅使用语言内置 `structuredClone` 与既有审计 / 类型模块）。
- 本地开发态未执行 `git add / commit / push / tag`；未删除用户源码；未移动 / 重命名既有文件；未清理历史 backlog；未改动未点名既有路由 / 页面 / 挂载 / 权限码 / 函数签名。
- 代码 / 测试 / 日志 / 文档无真实密码、token、密钥与明文端点；测试夹具为合成演示数据，患者标识使用 `patient-demo-001` 类占位；日志不含大段患者文本。

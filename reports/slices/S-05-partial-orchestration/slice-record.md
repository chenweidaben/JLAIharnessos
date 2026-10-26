# S-05（部分）切片记录：编排基础阶段①——新节点、断点快照、监控补齐与隔离/审计适配器

- **切片编号**：S-05（部分，阶段①）
- **产品口径**：健澜AI原生医院操作系统OS
- **署名**：杭州健澜科技有限公司
- **基线仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`，开工基线 HEAD `21adf951b28752e3cfe06a1d2e5ac2df77ff8ed9`
- **实现形态**：纯 types + pure functions + 进程内内存态离线闭环；无 DB、无网络、无真实 LLM、无真实 ASR；未注入适配器时返回离线空合成占位并标注降级口径；不新增第三方依赖；测试标识仅使用合成夹具。
- **Git 纪律**：本切片全程未执行 `git add`、`git commit`、`git push`、`git tag`；提交与双仓推送由主会话统一收口。

## 1. 目标与契约依据

### 1.1 技术文档锚点（`docs/technical/YXS20261026-development-spec-2026-10-26.md`）

| 章节 | 行号 | 本切片落点 |
|---|---|---|
| 5.3 上下文管理与断点快照 | 1068–1101 | 扩展运行上下文口径；定义 `StateSnapshot`、节点边界快照、按 `instanceId + patientId/visitId` 查询最近快照、状态机合法迁移后从 `currentNodeId` 续跑；历史 `completedNodes` 输出不重放；长住院关键节点类型预留；context 与 `completedNodes` 的输出/错误信息等自由文本经脱敏并与四维版本绑定归档 |
| 5.6 运行监控与全链路追踪 | 1135–1139 | 节点耗时、模型 ID/版本、知识版本、提示词版本、人工干预点与动作、备用模型切换、降级动作进入事件负载；实例摘要补齐完成率、平均耗时、失败计数、人工干预计数、人工修改计数、模型调用分布与异常分类 |
| 5.7 验收标准（S-05） | 1141–1143 | 三类新节点通过 DSL 校验；快照序列化/恢复单测覆盖暂停、人工挂起、失败续跑；监控事件字段齐全；既有 10 个声明包、S-09/S-10 包与既有工作流测试不回归；双 tsc 零错误 |
| 切片台账 S-05（部分） | 1419 | 编排基础：新节点类型、快照持久化协议、监控事件字段；快照恢复单测；既有工作流不回归 |

### 1.2 差距矩阵锚点（`docs/research/YXS20261026-gap-matrix-2026-10-26.md`）

| 编号 | 行号 | 差距说明 | 本切片落地 |
|---|---|---|---|
| O-01 | 279 | 既有 DSL 12 类节点缺少独立格式校验节点、独立通知节点与规范回写节点；格式校验原混在 LLM 节点 jsonSchema，通知/回写由 tool 节点承担 | 追加 `format-validate`、`notify`、`writeback` 三类独立节点；DSL 结构校验与语义校验补齐白名单 schema、渠道模板、目标映射与双端口规则；执行器在注册中心默认注册 |
| O-04 | 282 | 会话内上下文与压缩具备；跨会话持久化状态、进度节点、未完成任务与“摘要 + 关键节点”压缩规则未在编排器内存态对齐 | 阶段①先落地接口预留 + 进程内存快照仓储、快照序列化/反序列化、状态迁移校验、上下文回填与关键节点数据结构；DB 持久化仓储归后续批次 |
| O-09 | 287 | traceId 贯穿已有；断点接续持久化协议缺失：状态快照、上下文变量、当前节点、已完成节点输出、人工待办的落库与跨会话恢复点定位未见标准实现 | 落地 `SnapshotStore` 接口、`InMemorySnapshotStore`、`SnapshotService` 边界钩子、`resumePlan` 与引擎续跑接线；哈希链审计通过 S-08 批量桥接保持链路顺序 |

### 1.3 明确排除（阶段②，本切片未开工）

- O-02（第 280 行）意图识别独立规划器与任务规划器；
- 标准协同消息信封（spec 5.4）、人工确认三模式规则、跨实例监控聚合仓储与大盘切片；
- S-07、S-14~S-17；快照 DB 持久化；真实通知渠道（短信/邮件/微信）；真实 EMR 写回；真实向量相似度打分；
- 除本切片三类追加节点外，未在既有 `WorkflowNodeType` 枚举之外新增其他节点类型。

## 2. 设计落点与复用边界

### 2.1 DSL 三类新节点

- `WorkflowNodeType` 在既有 12 类基础上纯追加：`FORMAT_VALIDATE='format-validate'`、`NOTIFY='notify'`、`WRITEBACK='writeback'`。
- 新增 `FormatValidateNodeConfig`、`NotifyNodeConfig`、`WritebackNodeConfig`，并补全 `NodeConfigMap` 三个键；既有联合类型、既有节点配置与校验语义保持不变。
- `dsl/schema.ts` 的 `nodeTypeEnum` 追加三个字面量；配置仍按既有宽松记录口径保留，结构深校验落在 validator 语义层。
- `engine/validator.ts` 增补 `FORMAT_SCHEMA_MISSING`、`NOTIFY_CONFIG_MISSING`、`WRITEBACK_CONFIG_MISSING` 三个问题码；既有问题码未删改。format-validate 双端口按 `validPort`（缺省 `out`）与 `invalidPort`（缺省 `invalid`）匹配出边。

### 2.2 断点快照协议

- `engine/snapshotStore.ts` 定义 `TimelineMarker`、`RuntimeContextSnapshot`、`StateSnapshot`、`SnapshotQuery`、`SnapshotStore`、`BuildSnapshotDeps`；`versions` 直接复用 S-08 `AiVersionSnapshot`，不另立版本模型。
- `InMemorySnapshotStore` 以 Map + 数组按 `savedAt` 排序；`save`、`findLatest`、`list`、`remove`、`clear` 接口预留，后续接 DB 只替换实现不改接口。
- `serializeSnapshot`/`deserializeSnapshot` 往返纯 JSON 安全数据；序列化前拒绝函数、Map、Set、Date 与循环引用。
- `validateSnapshotTransition`：`WAITING_HUMAN`、`PAUSED`、`FAILED` 可迁入 `RUNNING`；`COMPLETED`、`CANCELLED` 终态拒绝续跑；`FAILED` 对应失败待重试边界，在编排层单独包装。节点成功完成边界落的快照状态为 `RUNNING`，按本切片迁移校验不可作为续跑源；可续跑快照仅限 `WAITING_HUMAN`、`PAUSED`、`FAILED`；成功完成边界快照仅用于审计留痕与版本归档，崩溃恢复续跑点以后续持久化批次按合法迁移规则复核。
- `hydrateContext` 回填 `input`、`vars`、`patient`、`user`、`completedNodes` 输出/错误信息与 `pendingHumanTasks`；不重新执行已完成节点、不重放工具调用。
- 快照脱敏覆盖 context 字段（`input`/`vars`/`patient`/`user`/`messages`/`lastOutputs`/`attachments`/`summary`/`keyNodes`）、`completedNodes` 的 `output` 与 `error`、待人工任务 ID 与关键节点事件摘要；字符串经 `desensitizeText`，结构化自由文本经 `desensitizePlain` 递归脱敏；数值/布尔原样保留，`Map`/`Set`/函数归为 `undefined`；四维版本随快照绑定归档。
- `engine/snapshotService.ts` 持有可选 `SnapshotStore` 与版本台账；提供 `onNodeCompleted`、`onHumanWaiting`、`onPaused`、`onNodeRetrying`、`onFailedPendingRetry` 边界钩子与 `resumePlan(query)`；未注入仓储时钩子为 no-op 降级，不抛错。

### 2.3 引擎接线（向后兼容）

- `WorkflowRunOptions` 纯追加可选字段 `snapshotStore`、`versions`、`resumeSnapshot`；既有 `run`/`runPath` 公开签名未改。
- 传入 `resumeSnapshot` 时先做状态迁移合法性校验，再由 `hydrateContext` 回填变量、入参、患者/用户上下文、已完成节点记录与待人工任务；入口节点取 `resumeSnapshot.currentNodeId`。
- 节点成功完成、人工挂起、外部暂停、节点重试、失败待重试五个边界调用 `SnapshotService` 对应钩子；人工 `human_waiting` 登记待办并落快照，`human_resolved` 移除待办。
- 不传快照字段的既有调用路径保持原行为；回归基线中 `orchestrator/engine`、`orchestrator/e2e`、`orchestrator/validator`、`orchestrator/pack`、`orchestrator/expression` 全部保持基线计数。

### 2.4 监控事件与实例摘要

- `ExecutionEvent.payload` 允许可选携带 `durationMs`、`modelId`、`modelVersion`、`knowledgeVersion`、`promptVersion`、`humanInterventionPoint`、`humanAction`、`fallbackModelSwitched`、`degradationAction`、`anomalyCode`、`attempt`、`tokens`；既有事件类型与既有字段语义不变。
- `ExecutionSummary` 纯追加 `completionRate`、`avgNodeDurationMs`、`failureCount`、`humanInterventionCount`、`humanModificationCount`、`modelCalls`、`anomalyBreakdown`；既有 `nodesExecuted`、`nodesFailed`、`totalAttempts`、`tokens` 口径保持不变。
- 摘要由事件台账在 `summarize(status)` 内纯函数聚合；跨实例仓储与大盘切片归阶段②。

### 2.5 三类新节点执行器

- `FormatValidateNodeExecutor`：按白名单结构校验 `source` 表达式、变量路径或上游输出；支持 `string`、`number`、`boolean`、`array`、`object`、`required`、`min`、`max`、`enum`、`items`、`properties`；不使用正则外任意代码、不 eval、不访问原型链；通过走 `validPort`，失败走 `invalidPort`，输出 `{ valid, errors, data }`。
- `NotifyNodeExecutor`：渲染 `template` 与 `recipientExpression`，组装通知载荷；运行时可选 `notifySink`，未注入时输出 `{ delivered:false, pending:true, channel, recipient, preview }` 离线占位；`requireConfirmation=true` 标记待确认，不绕过人工；不真正发短信/邮件/微信。
- `WritebackNodeExecutor`：强制提取 `patientId`、`visitId`；缺失分别报 `MISSING_PATIENT_ID`、`MISSING_VISIT_ID`；medium/high 风险在未确认时返回 `waiting_human` 语义挂起输出；运行时可选 `writebackAdapter`，未注入时输出 `{ persisted:false, pending:true, target }` 离线占位；`readOnly` 恒为 false，不直写 DB。
- 三个执行器均实现既有 `NodeExecutor` 契约；`assertNotCancelled` 前置；取消信号语义对齐既有执行器。

### 2.6 similar-case-query 隔离适配器

- `adapters/similarCaseAdapter.ts` 的 `buildSimilarCaseQuery` 从工作流上下文提取 `patientId`、`visitId`、`roles` 与 actor 信息；用途固定 `similar-case-only`，编排侧不允许通过上下文改写。
- `invokeSimilarCaseQuery` 调用 S-13 `PatientIsolationService.querySimilarCases`；缺 `patientId`、角色不匹配、就诊不匹配、分区缺失、跨分区等阻断原因码全部由 S-13 判定并透传；编排侧不复制隔离规则、不新增审计枚举值、不做相似度打分。
- 放行结果返回分区内命中片段深拷贝；测试间通过 S-13/S-08 既有单例重置接口清台账。

### 2.7 AI 事件批量入链适配器

- `engine/auditBatchBridge.ts` 的 `buildAuditInput` 纯映射 S-08 `AiAuditEventInput`；版本缺失时补离线占位，引用编号、耗时、token、风险等级、人工动作、工具调用按事件装配；自由文本脱敏由 S-08 内部完成。
- `OrchestratorAuditBridge` 构造注入 `AiAuditService`；`recordBatch` 先逐条 `validateAiAuditInput`，失败整批抛错并指明批次序号；随后顺序 `record`，前一条 `hash` 即后一条 `prevHash`。
- 适配器复用 S-08 既有 `AiGuardLevel`、`AiHumanAction`、`ToolCallRecord.riskLevel/result` 枚举值；不新增审计枚举值，不包装节点成功/失败状态，不兜底捕获主流程异常。

### 2.8 只读复用与未回改清单

- **S-08 审计**：复用 `AiActor`、`AiVersionSnapshot`、`AiAuditEventInput`、`AiAuditEvent`、`AiGuardLevel`、`AiHumanAction`、`ToolCallRecord`、`validateAiAuditInput`、`AiAuditService.record/verifyChain/reset` 与 `AuditLogger` 桥接口径；未修改 S-08 源码。
- **S-13 隔离**：复用 `PatientIsolationService`、`getPatientIsolationService`、`_resetPatientIsolationService`、`IsolationQuery`、`IsolationVerdict`、`ISOLATION_TOOL_ID`、`ISOLATION_SCENARIO`、`ISO-001~006` 与 `MISSING_PATIENT_ID`；未修改隔离服务源码。
- **S-01 输出防护**：本切片未新增 Guard 调用点，也未重复实现输出防护；既有 LLM/tool 节点沿用既有风险与防护语义，未修改 `src/security/ai/outputGuard.ts` 与 `src/security/ai/types.ts`。
- **S-06 准入**：未修改准入注册表、风险映射与 `agentAdmission.ts` 源码；本切片不新增角色/风险映射枚举。
- **S-12 引用协议、S-11 知识台账、S-13 隔离索引**：本切片不替代其既有模块；编排侧适配器只做上下文取值、错误码透传与离线降级。
- 既有 10 个在册声明包、S-09 门诊包、S-10 住院包、既有 BFF 调用面、前端路由/页面/挂载/权限码/函数签名均未回改；`src/bff/agents/index.ts` 未触碰。

## 3. 新增 / 修改文件清单（实测行数与字节）

> 行数口径：`(Get-Content).Count`；字节口径：`(Get-Item).Length`。修改文件列示当前全量大小，不代表插入增量；新增文件为当前全量大小。

| 操作 | 路径 | 行数 | 字节 | 说明 |
|---|---|---:|---:|---|
| 新增源码 | `src/orchestrator/engine/snapshotStore.ts` | 322 | 11743 | 快照纯数据类型、进程内存仓储、序列化/反序列化、状态迁移校验、上下文回填、completedNodes 输出/错误脱敏与版本归档口径 |
| 新增源码 | `src/orchestrator/engine/snapshotService.ts` | 132 | 4437 | 快照边界服务、四维版本台账、resumePlan 与无仓储 no-op 降级 |
| 新增源码 | `src/orchestrator/nodes/specialExecutors.ts` | 315 | 10840 | format-validate、notify、writeback 三类独立节点执行器与离线占位语义 |
| 新增源码 | `src/orchestrator/adapters/similarCaseAdapter.ts` | 100 | 3783 | similar-case-query 上下文取值、S-13 隔离判定透传与分区内片段深拷贝 |
| 新增源码 | `src/orchestrator/engine/auditBatchBridge.ts` | 123 | 4128 | 编排事件到 S-08 审计入参纯映射、顺序哈希链与批次结构校验 |
| 修改源码 | `src/orchestrator/dsl/types.ts` | 601 | 20293 | 纯追加三类节点枚举、配置接口、NodeConfigMap 键与新问题码 |
| 修改源码 | `src/orchestrator/dsl/schema.ts` | 198 | 6291 | nodeTypeEnum 纯追加三类节点字面量 |
| 修改源码 | `src/orchestrator/engine/validator.ts` | 437 | 15532 | format-validate 双端口匹配与三类节点配置语义校验 |
| 修改源码 | `src/orchestrator/engine/context.ts` | 315 | 9958 | 快照入参/actor/已完成节点/待办回填与变量只读访问方法 |
| 修改源码 | `src/orchestrator/engine/recorder.ts` | 241 | 8368 | 监控事件可选负载字段与实例摘要聚合追加，既有字段口径不变 |
| 修改源码 | `src/orchestrator/engine/runtime.ts` | 245 | 8133 | 通知消息、写回结果、写回适配器类型与可选注入接口 |
| 修改源码 | `src/orchestrator/engine/engine.ts` | 659 | 23780 | 快照选项、边界钩子、续跑回填、人工台账、监控字段与 format-validate 端口选边 |
| 修改源码 | `src/orchestrator/nodes/registry.ts` | 90 | 2579 | 默认注册三类新执行器，既有执行器原位保留 |
| 修改桶文件 | `src/orchestrator/index.ts` | 154 | 5396 | 末尾纯追加 S-05 模块导出，既有导出未删改 |
| 新增测试 | `tests/unit/orchestrator/specialNodes.test.ts` | 260 | 10954 | 三类新节点 DSL 校验、白名单执行器、通知/写回离线占位、确认挂起、缺 patientId/visitId 阻断与取消信号测试 |
| 新增测试 | `tests/unit/orchestrator/snapshotStore.test.ts` | 224 | 9624 | 快照仓储定位排序、JSON 往返、状态迁移、回填不重放、上下文与已完成节点输出/错误脱敏及版本归档测试 |
| 新增测试 | `tests/unit/orchestrator/snapshotResume.test.ts` | 170 | 7936 | 人工挂起、暂停、失败待重试边界续跑与既有不传快照路径回归测试 |
| 新增测试 | `tests/unit/orchestrator/monitoringEvents.test.ts` | 89 | 4088 | 监控事件版本/干预/降级字段与实例摘要聚合测试 |
| 新增测试 | `tests/unit/orchestrator/similarCaseAdapter.test.ts` | 147 | 5659 | 隔离放行/阻断、用途固定、双标识与审计回查测试 |
| 新增测试 | `tests/unit/orchestrator/auditBatchBridge.test.ts` | 151 | 5800 | 批量哈希链接续、枚举复用、字段透传、批次校验与纯映射测试 |
| 新增记录 | `reports/slices/S-05-partial-orchestration/slice-record.md` | 273 | 34372 | 本切片契约依据、文件清单、测试门禁、回归比对、自检记录与未闭环项台账 |

## 4. 测试与门禁结果

### 4.1 新增测试（合计 41 pass / 0 fail / 135 expect）

| 测试文件 | pass | fail | expect | 日志 |
|---|---:|---:|---:|---|
| `tests/unit/orchestrator/specialNodes.test.ts` | 14 | 0 | 23 | `logs/s05-remediation-new-specialNodes-20261027-013615.log` |
| `tests/unit/orchestrator/snapshotStore.test.ts` | 10 | 0 | 43 | `logs/s05-remediation-new-snapshotStore-20261027-013615.log` |
| `tests/unit/orchestrator/snapshotResume.test.ts` | 4 | 0 | 16 | `logs/s05-remediation-new-snapshotResume-20261027-013615.log` |
| `tests/unit/orchestrator/monitoringEvents.test.ts` | 3 | 0 | 13 | `logs/s05-remediation-new-monitoringEvents-20261027-013615.log` |
| `tests/unit/orchestrator/similarCaseAdapter.test.ts` | 5 | 0 | 15 | `logs/s05-remediation-new-similarCaseAdapter-20261027-013615.log` |
| `tests/unit/orchestrator/auditBatchBridge.test.ts` | 5 | 0 | 25 | `logs/s05-remediation-new-auditBatchBridge-20261027-013615.log` |

### 4.2 新增测试覆盖对照

| 任务书验收点 | 覆盖测试 | 结果 |
|---|---|---|
| 三类新节点 DSL 校验正反用例；合法工作流通过；缺 schema/channel/template/target/mapping 报错；format-validate 双端口出边匹配 | `specialNodes.test.ts` 中 DSL 校验组 5 例通过 | 5/0 |
| format-validate 类型/必填/范围/枚举正反用例；非法 schema 拒绝；取消信号前置生效 | `specialNodes.test.ts` 中执行器组 3 例通过 | 3/0 |
| notify 离线占位与 sink 注入；requireConfirmation 标记待确认 | `specialNodes.test.ts` 中通知组 2 例通过 | 2/0 |
| writeback 离线占位、medium/high 确认挂起、缺 `patientId`/`visitId` 阻断 | `specialNodes.test.ts` 中写回组 4 例通过；低风险直接离线占位，medium 未确认挂起，缺 `patientId` 与缺 `visitId` 分别返回对应错误码 | 4/0 |
| 快照 save/findLatest/list/remove/clear；instanceId 精确匹配；patientId+visitId 组合匹配；序列化纯 JSON 安全往返 | `snapshotStore.test.ts` 定位与序列化组 4 例通过 | 4/0 |
| 终态快照拒绝续跑；`COMPLETED → RUNNING` 抛 `IllegalStateTransitionError`；`WAITING_HUMAN/PAUSED/FAILED → RUNNING` 合法 | `snapshotStore.test.ts` 状态迁移组 3 例通过 | 3/0 |
| hydrate 回填 input/vars/patient/user/completedNodes/pendingHumanTasks；已完成节点工具调用计数为 0；context 与 `completedNodes` 的 `output`/`error` 脱敏生效；结构化嵌套字符串同样遮蔽，手机号掩码 `138****5678`、身份证掩码 `110101********1234`；回填后保持脱敏形态；四维版本归档 | `snapshotStore.test.ts` 回填与脱敏组 3 例通过 | 3/0 |
| 人工挂起、暂停、失败待重试三类边界快照续跑；既有不传快照路径行为不变 | `snapshotResume.test.ts` 4 例通过 | 4/0 |
| 节点耗时、模型/知识/提示词版本、人工干预点与动作、备用模型切换、降级动作进入事件；摘要新增聚合字段数值正确，既有字段不丢 | `monitoringEvents.test.ts` 3 例通过 | 3/0 |
| 缺 `patientId` 阻断 `MISSING_PATIENT_ID` 且隔离审计事件入链；缺 `visitId` 不影响放行；角色不匹配阻断；用途固定；放行返回分区内片段 | `similarCaseAdapter.test.ts` 5 例通过 | 5/0 |
| 批量入链顺序与 `prevHash/hash` 链接续；必填缺失整批抛错并指明序号；复用既有枚举；双标识透传；AuditLogger 桥接；节点状态不改写；纯映射正反用例 | `auditBatchBridge.test.ts` 5 例通过 | 5/0 |

### 4.3 既有回归（56 份，全部 exit=0、fail=0；MISMATCH_COUNT=0；未删用例、未改既有断言换绿灯）

汇总 CSV：`logs/s05-regression-20261027-013754-summary.csv`。

| 测试文件 | pass | fail | expect | 状态 | 日志 |
|---|---:|---:|---:|---|---|
| `tests/unit/outpatientAssistant.test.ts` | 16 | 0 | 40 | OK | `logs/s05-regression-outpatientAssistant-20261027-013754.log` |
| `tests/unit/labInterpretation.test.ts` | 14 | 0 | 32 | OK | `logs/s05-regression-labInterpretation-20261027-013754.log` |
| `tests/unit/labInterpretEngine.test.ts` | 6 | 0 | 14 | OK | `logs/s05-regression-labInterpretEngine-20261027-013754.log` |
| `tests/unit/emrAiOutpatientRecordGenV14.test.ts` | 5 | 0 | 13 | OK | `logs/s05-regression-emrAiOutpatientRecordGenV14-20261027-013754.log` |
| `tests/unit/emrAiLabInterpretV14.test.ts` | 5 | 0 | 10 | OK | `logs/s05-regression-emrAiLabInterpretV14-20261027-013754.log` |
| `tests/unit/emrAiLabInterpretDetailV14.test.ts` | 5 | 0 | 10 | OK | `logs/s05-regression-emrAiLabInterpretDetailV14-20261027-013754.log` |
| `tests/unit/emrAiOutpatientFollowupRecoV14.test.ts` | 5 | 0 | 10 | OK | `logs/s05-regression-emrAiOutpatientFollowupRecoV14-20261027-013754.log` |
| `tests/unit/emrAiOutpatientPreTriageV14.test.ts` | 5 | 0 | 10 | OK | `logs/s05-regression-emrAiOutpatientPreTriageV14-20261027-013754.log` |
| `tests/unit/aiBrainV2Outpatient.test.ts` | 13 | 0 | 49 | OK | `logs/s05-regression-aiBrainV2Outpatient-20261027-013754.log` |
| `tests/unit/orchestrator/agents.load.test.ts` | 24 | 0 | 114 | OK | `logs/s05-regression-orchestrator-agents.load-20261027-013754.log` |
| `tests/unit/orchestrator/agents.exec.test.ts` | 3 | 0 | 10 | OK | `logs/s05-regression-orchestrator-agents.exec-20261027-013754.log` |
| `tests/unit/orchestrator/engine.test.ts` | 16 | 0 | 36 | OK | `logs/s05-regression-orchestrator-engine-20261027-013754.log` |
| `tests/unit/orchestrator/e2e.test.ts` | 2 | 0 | 8 | OK | `logs/s05-regression-orchestrator-e2e-20261027-013754.log` |
| `tests/unit/security/audit.test.ts` | 19 | 0 | 34 | OK | `logs/s05-regression-security-audit-20261027-013754.log` |
| `tests/unit/security/outputGuard.test.ts` | 18 | 0 | 40 | OK | `logs/s05-regression-security-outputGuard-20261027-013754.log` |
| `tests/unit/security/aiAudit.test.ts` | 21 | 0 | 85 | OK | `logs/s05-regression-security-aiAudit-20261027-013754.log` |
| `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts` | 24 | 0 | 90 | OK | `logs/s05-regression-knowledgeRegistry-20261027-013754.log` |
| `tests/unit/knowledge-platform/citation/citationProtocol.test.ts` | 27 | 0 | 80 | OK | `logs/s05-regression-citationProtocol-20261027-013754.log` |
| `tests/unit/knowledge-platform/isolation/patientIsolation.test.ts` | 33 | 0 | 98 | OK | `logs/s05-regression-patientIsolation-20261027-013754.log` |
| `tests/unit/knowledge/KnowledgeBaseManager.test.ts` | 6 | 0 | 15 | OK | `logs/s05-regression-KnowledgeBaseManager-20261027-013754.log` |
| `tests/unit/knowledge/RetrievalEngine.test.ts` | 9 | 0 | 21 | OK | `logs/s05-regression-RetrievalEngine-20261027-013754.log` |
| `tests/unit/knowledge/TextSplitter.test.ts` | 10 | 0 | 27 | OK | `logs/s05-regression-TextSplitter-20261027-013754.log` |
| `tests/unit/knowledge/VectorStore.test.ts` | 14 | 0 | 17 | OK | `logs/s05-regression-VectorStore-20261027-013754.log` |
| `tests/unit/knowledge/searchMedicalKnowledge.test.ts` | 9 | 0 | 23 | OK | `logs/s05-regression-searchMedicalKnowledge-20261027-013754.log` |
| `tests/unit/knowledge/medicalRecordQc.test.ts` | 12 | 0 | 29 | OK | `logs/s05-regression-medicalRecordQc-20261027-013754.log` |
| `tests/unit/ragTuningV5.test.ts` | 5 | 0 | 8 | OK | `logs/s05-regression-ragTuningV5-20261027-013754.log` |
| `tests/unit/modelProvider.test.ts` | 4 | 0 | 20 | OK | `logs/s05-regression-modelProvider-20261027-013754.log` |
| `tests/unit/core/SystemPromptBuilder.test.ts` | 11 | 0 | 21 | OK | `logs/s05-regression-SystemPromptBuilder-20261027-013754.log` |
| `tests/unit/promptGovernanceV5.test.ts` | 5 | 0 | 7 | OK | `logs/s05-regression-promptGovernanceV5-20261027-013754.log` |
| `tests/unit/coordinator/AgentRegistry.test.ts` | 8 | 0 | 13 | OK | `logs/s05-regression-AgentRegistry-20261027-013754.log` |
| `tests/unit/inpatientAssistant.test.ts` | 14 | 0 | 30 | OK | `logs/s05-regression-inpatientAssistant-20261027-013754.log` |
| `tests/unit/contextSummary.test.ts` | 14 | 0 | 26 | OK | `logs/s05-regression-contextSummary-20261027-013754.log` |
| `tests/unit/emrAiDischargeSummaryGenV14.test.ts` | 5 | 0 | 13 | OK | `logs/s05-regression-emrAiDischargeSummaryGenV14-20261027-013754.log` |
| `tests/unit/emrAiDischargeSummaryV14.test.ts` | 5 | 0 | 10 | OK | `logs/s05-regression-emrAiDischargeSummaryV14-20261027-013754.log` |
| `tests/unit/emrAiPostopProgressTrackV14.test.ts` | 5 | 0 | 10 | OK | `logs/s05-regression-emrAiPostopProgressTrackV14-20261027-013754.log` |
| `tests/unit/emrAiNursingNoteGenV14.test.ts` | 5 | 0 | 13 | OK | `logs/s05-regression-emrAiNursingNoteGenV14-20261027-013754.log` |
| `tests/unit/emrCourseNodeV14.test.ts` | 5 | 0 | 10 | OK | `logs/s05-regression-emrCourseNodeV14-20261027-013754.log` |
| `tests/unit/threeLevelWardRoundV13.test.ts` | 5 | 0 | 6 | OK | `logs/s05-regression-threeLevelWardRoundV13-20261027-013754.log` |
| `tests/unit/morningBriefV11.test.ts` | 4 | 0 | 19 | OK | `logs/s05-regression-morningBriefV11-20261027-013754.log` |
| `tests/unit/inpatientBrainV2.test.ts` | 6 | 0 | 6 | OK | `logs/s05-regression-inpatientBrainV2-20261027-013754.log` |
| `tests/unit/orchestrator/validator.test.ts` | 13 | 0 | 17 | OK | `logs/s05-regression-orchestrator-validator-20261027-013754.log` |
| `tests/unit/orchestrator/pack.test.ts` | 5 | 0 | 12 | OK | `logs/s05-regression-orchestrator-pack-20261027-013754.log` |
| `tests/unit/orchestrator/expression.test.ts` | 29 | 0 | 56 | OK | `logs/s05-regression-orchestrator-expression-20261027-013754.log` |
| `tests/unit/bff/agents/outpatient/agentPackage.test.ts` | 4 | 0 | 29 | OK | `logs/s05-regression-outpatient-agentPackage-20261027-013754.log` |
| `tests/unit/bff/agents/outpatient/dialogueNormalizer.test.ts` | 6 | 0 | 18 | OK | `logs/s05-regression-outpatient-dialogueNormalizer-20261027-013754.log` |
| `tests/unit/bff/agents/outpatient/draftSchema.test.ts` | 10 | 0 | 21 | OK | `logs/s05-regression-outpatient-draftSchema-20261027-013754.log` |
| `tests/unit/bff/agents/outpatient/intentClassifier.test.ts` | 7 | 0 | 18 | OK | `logs/s05-regression-outpatient-intentClassifier-20261027-013754.log` |
| `tests/unit/bff/agents/outpatient/outpatientWorkflow.test.ts` | 12 | 0 | 39 | OK | `logs/s05-regression-outpatient-outpatientWorkflow-20261027-013754.log` |
| `tests/unit/bff/agents/outpatient/qcRealtime.test.ts` | 9 | 0 | 11 | OK | `logs/s05-regression-outpatient-qcRealtime-20261027-013754.log` |
| `tests/unit/bff/agents/shared/clinicalReportInterpretation.test.ts` | 5 | 0 | 19 | OK | `logs/s05-regression-shared-clinicalReportInterpretation-20261027-013754.log` |
| `tests/unit/bff/agents/inpatient/documentTemplates.test.ts` | 15 | 0 | 49 | OK | `logs/s05-regression-inpatient-documentTemplates-20261027-013754.log` |
| `tests/unit/bff/agents/inpatient/vitalsParser.test.ts` | 9 | 0 | 36 | OK | `logs/s05-regression-inpatient-vitalsParser-20261027-013754.log` |
| `tests/unit/bff/agents/inpatient/consistencyCheck.test.ts` | 6 | 0 | 6 | OK | `logs/s05-regression-inpatient-consistencyCheck-20261027-013754.log` |
| `tests/unit/bff/agents/inpatient/dischargeSchema.test.ts` | 13 | 0 | 26 | OK | `logs/s05-regression-inpatient-dischargeSchema-20261027-013754.log` |
| `tests/unit/bff/agents/inpatient/inpatientWorkflow.test.ts` | 17 | 0 | 58 | OK | `logs/s05-regression-inpatient-inpatientWorkflow-20261027-013754.log` |
| `tests/unit/bff/agents/inpatient/agentPackage.test.ts` | 5 | 0 | 41 | OK | `logs/s05-regression-inpatient-agentPackage-20261027-013754.log` |

### 4.4 双 tsc 门禁

| 门禁 | 命令（工作目录） | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit`（仓库根） | 0 | `logs/s05-tsc-root-20261027-013628.log` | 0 |
| web tsc | `bun x tsc --noEmit`（`web/` 目录；bun 使用全路径 `C:\Users\lenovo\.bun\bin\bun.exe`） | 0 | `logs/s05-tsc-web-20261027-013628.log` | 0 |

## 5. 自检记录

### 5.1 品牌口径扫描

- 扫描范围：本切片 20 个新增/修改源码与测试文件。
- 禁用词：按任务书列明的八类历史品牌错误拼写与错误中文名口径逐项扫描。
- 命中数：**0**。
- 正式口径：源码头部与记录均使用「健澜科技」「杭州健澜科技有限公司」「健澜AI原生医院操作系统OS」。

### 5.2 密钥、端点与占位符扫描

- 明文口令、密码、API key、Bearer 长值、私钥头、`http://`/`https://` 明文端点命中：**0**。
- 宽口径 `token`/`tokens` 命中均为 `tokenUsage`、`tokensInput`、`tokensOutput`、LLM 用量字段、既有表达式分词口径或注释，非访问凭证；凭证类口令、API key、Bearer 长值、私钥与明文端点命中：**0**。
- 未解析待办占位标记（常见任务清单标记、中文待补充/待完成、英文占位文本）命中：**0**。

### 5.3 依赖与桶文件核验

- `package.json`、`package-lock.json`、`bun.lock`、`bun.lockb`、`agents/manifest.json`、`src/bff/agents/index.ts` 跟踪差异文件数：**0**；依赖 diff 行数：**0**；本切片未新增第三方依赖。
- `src/orchestrator/index.ts` 仅在文件末尾纯追加 S-05 模块导出；既有导出原位保留。
- `src/orchestrator/dsl/types.ts`、`src/orchestrator/dsl/schema.ts`、`src/orchestrator/engine/validator.ts`、`src/orchestrator/engine/context.ts`、`src/orchestrator/engine/recorder.ts`、`src/orchestrator/engine/runtime.ts`、`src/orchestrator/engine/engine.ts`、`src/orchestrator/nodes/registry.ts` 的修改均为编排层追加或最小接线；未删除既有公开符号与既有测试断言。

### 5.4 verifier-hub 与自定义门禁证据

- 自定义综合门禁日志：`logs/s05-final-verify-20261027-014118.log`，结论 `OVERALL=PASS`；20 个源码/测试文件行数与字节匹配记录，6 份新测试合计 41/0/135，56 份回归全部 OK，双 tsc 日志均为 0 字节，品牌、凭证端点、未解析待办标记与受保护文件检查均为 0 命中。
- 记录文件 verifier 日志：`logs/s05-verifier-record-20261027-014118.log`；Markdown 格式校验通过，26/26 必备章节、锚点与整改口径命中，八类品牌禁用词 0 命中，未解析占位符 0 命中。
- 源码/测试 verifier 日志：`logs/s05-verifier-source-placeholders-20261027-014118.log`；20 份文件格式校验通过；42 处省略号经甄别为 TypeScript 展开/剩余参数语法，0 处未解析非省略号占位符。
- 汇总审计日志：`logs/s05-final-audit-20261027-014118.log`；引用日志存在性、6 份新测试、56 份回归、双 tsc、品牌/密钥/占位符、受保护文件与记录度量逐项 PASS。

## 6. 未闭环项台账（不谎称通过）

| 类别 | 未闭环内容 | 后续批次口径 |
|---|---|---|
| 快照持久化 | 当前仅 `InMemorySnapshotStore`；跨进程/重启恢复、快照 DB 表结构、索引、过期清理与备份未实现 | 后续编排持久化批次替换 `SnapshotStore` 实现，接口不变 |
| 快照续跑边界 | 节点成功完成边界落的快照状态为 `RUNNING`，按本切片迁移校验不可作为续跑源；可续跑快照仅限 `WAITING_HUMAN`、`PAUSED`、`FAILED`；成功完成边界快照仅用于审计留痕与版本归档 | 崩溃恢复续跑点以后续持久化批次按合法迁移规则复核 |
| 人工修改动作归类 | 现有 `HumanResolution` 仅含 `approved`、`formData`、`reviewerId`、`comment`；引擎 `human_resolved` 事件仅映射 adopted/rejected；`humanModificationCount` 只在显式 `humanAction='modified'` 负载下累计；本切片不扩展既有人工决议契约 | 人工「修改」动作归类随阶段②人工三模式规则（O-06）落地 |
| 跨实例监控 | 当前仅单实例事件台账与摘要聚合；跨实例仓储、按智能体/版本/科室/场景/时间窗切片、大盘数据源未实现 | 阶段②跨实例聚合仓储与监控大盘切片 |
| 通知渠道 | `notify` 节点仅有离线占位与可选 sink；短信、邮件、微信真实投递、死信与超时升级未实现 | 后续宿主接入真实通知渠道与告警规则 |
| 写回目标 | `writeback` 节点仅有离线占位与可选适配器；真实 EMR 草稿、审计日志、工作流状态、患者记录回写未接线；不直写 DB | 后续宿主接入受控写回适配器、幂等键、授权与审计链 |
| 相似病例检索 | 编排适配器只调用 S-13 隔离判定；真实向量召回、相似度打分、跨科室知识检索未实现 | 后续 RAG/相似度服务批次 |
| 阶段②编排能力 | 意图识别独立规划器、任务规划器、标准协同消息信封、人工三模式规则未开工 | O-02、spec 5.4、O-06 对应阶段②切片 |
| 关联后续切片 | S-07、S-14~S-17 未在本切片开工；快照事件总线真实挂载、审计台账/草稿快照持久化落库未做 | 按主会话切片台账推进 |
| 医学外部字典 | 本切片不涉及 ASR、药典、ICD、检验参考范围、危急值、护理/医嘱字典；既有 S-10 未闭环项不并入 S-05 验收 | 后续住院/门诊工具与 RAG 批次 |

## 7. S-10/S-09 复用提示（后续切片）

- 共用解读组件仍位于 `src/bff/agents/shared/clinicalReportInterpretation.ts`；后续门诊/住院智能体涉及检验检查解读时继续委派该组件，不得重复实现患者版措辞、危急值分级或证据级别推导。
- S-08 审计链、S-13 隔离判定、S-12 引用协议与 S-11 知识台账继续作为只读底座；新增编排能力应通过适配器注入，不回改既有注册表与既有测试断言。

## 8. 交付边界声明

本切片只交付阶段①编排基础：三类新节点、进程内存断点快照协议、监控事件/摘要字段补齐、similar-case-query 隔离适配器与 AI 事件批量入链适配器。阶段②意图规划、协同信封、人工三模式、跨实例聚合、真实渠道/写回/召回与 DB 持久化均未开工；本切片未执行任何 git 写操作。

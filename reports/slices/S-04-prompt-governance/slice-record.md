# S-04 切片记录：提示词四层资产治理与版本化

- **切片编号**：S-04
- **产品**：健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）
- **署名**：杭州健澜科技有限公司
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- **分支**：`consult-agent-m86`
- **基线 HEAD**：`1d0dc546e5d32e42dc8313d4601cb09a8f72abe6`
- **完成时间**：2026-10-26 21:03（Asia/Shanghai）
- **环境**：`DEMO_MODE=1`；无 PostgreSQL / Redis / 真实 LLM 凭证；纯类型 + 纯函数 + 进程内存实现，离线闭环验证；不接真实 LLM、不连数据库、不发起网络请求；不改动既有 `SystemPromptBuilder` 与 `promptGovernanceV5` 的对外行为与断言。

## 1. 目标与契约依据

### 1.1 切片目标

落地提示词工程管理子系统后端内存模块：四层资产模型与台账登记 / 发布状态机 / 版本对比预留 / Few-shot 引用校验；输出 Schema 轻量校验子集、失败计数、指数退避重试与按风险等级降级；采纳 / 修改 / 拒绝 / 修改字符 / Schema 失败按版本聚合与阈值告警；按 `system → scenario → department → task → 工具说明` 强制顺序拼装加载链，system 层缺失或未 active 时拒绝拼装并写安全事件；无资产库配置时回退既有 `SystemPromptBuilder` 默认文本，既有 11 例岗位提示词测试不回归。

### 1.2 契约依据（文档章节与台账行，编号以成文为准）

| 依据 | 位置 | 落点 |
|---|---|---|
| 技术文档 3.4.2 四层资产模型 | `docs/technical/YXS20261026-development-spec-2026-10-26.md` 第 454–492 行 | `PromptAsset` / `PromptChangeEntry` / `PromptMetrics` 类型逐字段对齐；`level / riskLevel / status` 枚举契约 |
| 技术文档 3.4.3 加载链与强制顺序 | 同上，第 494–507 行 | ① system → ② scenario → ③ department → ④ task → ⑤ 工具说明；system 层必须存在且 `active`；智能体包 `systemPrompt` 只能引用 ②③ 层，不得覆盖 ① 层文本 |
| 技术文档 3.4.4 Schema 校验与重试降级 | 同上，第 509–520 行 | 默认最多重试 2 次、指数退避；`low → template-fallback`、`medium → manual-queue`、`high → block-submit`；校验错误与重试次数预留计入 `schemaFailureRate` 与审计事件 |
| 技术文档 3.4.5 指标闭环 | 同上，第 522–526 行 | 按 `agentId + scenario + promptVersion + 时间窗` 聚合；`modificationRate / avgModifiedChars / schemaFailureRate / rejectionRate` 阈值告警；版本与模型 / 知识 / 平台版本四元组绑定预留 |
| 技术文档 3.4.6 模块划分与验收 | 同上，第 528–539 行 | `assetRegistry.ts` / `schemaGuard.ts` / `metricsAggregator.ts` / 加载器四模块路径与职责；验收标准：system 缺失 / 失效拒绝并留安全事件、四层顺序单测固化、Few-shot 缺失明确报错、Schema 重试降级可单测、指标按版本聚合可查询、既有岗位提示词测试不回归 |
| 差距矩阵 P-01 系统级红线版本化 | `docs/research/YXS20261026-gap-matrix-2026-10-26.md` 第 210 行 | system 层资产结构化登记、变更记录、审批留痕；硬编码 `ETHICS_LAYER` 本轮保持默认兜底不迁移 |
| 差距矩阵 P-02 场景级资产与 Few-shot | 同上，第 211 行 | scenario 层资产台账；`fewShotRefs` 运行时存在性与 `active` 状态校验 |
| 差距矩阵 P-03 科室级备案台账 | 同上，第 212 行 | department 层资产按科室 / `all` 全院兜底备案；审批人 / 启用状态字段落台账 |
| 差距矩阵 P-05 Schema 校验重试降级闭环 | 同上，第 214 行 | `validateSchema` 轻量子集 + `planSchemaRetry` 重试决策 + 三级降级动作 + 事件台账 |
| 差距矩阵 P-07 引用标注协议 | 同上，第 216 行 | 本切片仅预留 `outputSchemaRef` / 指标字段；引用编号 /「待核实」结构化输出字段归 S-12 |
| 差距矩阵 P-08 生命周期与指标告警 | 同上，第 217 行 | 分类目录 / 版本变更记录 / 对比回滚预留 / 采纳率与修改字数聚合 / 异常阈值告警 / `encrypted` 归属标记 |
| 切片台账 S-04 | 同上，第 349 行 | 系统级提示词版本化可追溯；场景 / 科室资产台账；Few-shot 引用校验失败有明确错误；采纳率字段预留聚合口；既有硬编码伦理层迁移需回归全部岗位提示词测试 |

### 1.3 范围边界（本切片不做）

- **不做任务层动态上下文增量编辑**（P-04，S-05）：患者信息 / 就诊数据 / 历史摘要 / 知识片段 / 已有病历内容 / 光标位置段落的运行时组装不在本切片。
- **不做思维链三阶段 DSL 模板**（P-06，S-05）：提纲 → 填充 → 润色标准流程模板归后续切片。
- **不做引用编号协议与「待核实」结构化字段**（P-07，S-12）：本切片仅保留 `outputSchemaRef` 引用字段。
- **不做 BFF 路由资产台账接口与前端页面**：`promptGovernanceV5.ts` 不扩展；四层分类目录、版本对比回滚界面、指标看板、审批流页面归后续切片。
- **不迁移既有硬编码 `ETHICS_LAYER`**：保持默认兜底行为不变；加载器在无 system 资产时回退 `SystemPromptBuilder.build()`。
- **不实现真实资产静态加密**：仅保留 `encrypted` 布尔标记与可插拔加密器接口预留，默认透传，风险见第 5 节。
- 不新增 `ModelProviderPort`；不接 DB / 网络 / 真实 LLM；台账与事件均为进程内存态，不落库。

## 2. 输入输出契约

### 2.1 资产台账（`src/bff/prompt/assetRegistry.ts`）

**类型契约**（字段对齐 3.4.2，逐字段不缺漏）：

- `PromptLevel = 'system' | 'scenario' | 'department' | 'task'`
- `PromptAssetStatus = 'draft' | 'review' | 'active' | 'archived' | 'deprecated'`
- `PromptRiskLevel = 'low' | 'medium' | 'high'`
- `PromptScope { scenario?: string; department?: string; agentId?: string }`
- `PromptAsset { id; level; name; nameEn?; scope; version; content; variables: string[]; fewShotRefs: string[]; outputSchemaRef?; riskLevel; status; owner; approver?; approvedAt?; changeLog: PromptChangeEntry[]; metrics: PromptMetrics; encrypted: boolean; createdAt; updatedAt }`
- `PromptChangeEntry { version; changedAt; operator; summary; diffRef; parentVersion?; reviewResult?: 'approved' | 'rejected' }`
- `PromptMetrics { agentId; scenario; version; window; calls; adoptionRate; modificationRate; rejectionRate; avgModifiedChars; schemaFailureRate; abnormalFlags: string[] }`
- `PublishChange { operator; summary; diffRef; parentVersion?; reviewResult: 'approved' | 'rejected' }`
- `PromptAssetFilter { level?; status?; scenario?; department?; agentId? }`

**`PromptAssetRegistry` 类 + 模块级单例**：

| 接口 | 契约 |
|---|---|
| `register(asset): PromptAsset` | 必填 / 枚举 / 变量清单校验（错误汇总抛 `[PA-001]`）；重复 `id` 拒绝（`[PA-002]`）；`active` 状态必须具备 `approver / approvedAt`；返回深拷贝 |
| `getAsset(id): PromptAsset \| undefined` | 返回深拷贝；未登记返回 `undefined` |
| `getActiveAsset(level, scope): PromptAsset \| undefined` | 按 level + scope 精确匹配优先；`department` 空 / `'all'` 为全院兜底；同 scope 多条 active 取最新 `updatedAt`；未命中返回 `undefined` |
| `listAssets(filter?): PromptAsset[]` | 按 level / status / scenario / department / agentId 过滤；返回深拷贝数组，不可反向修改台账 |
| `publish(id, change): PromptAsset` | 追加 `changeLog`、更新 `updatedAt`；仅 `draft / review` 且 `reviewResult='approved'` 可置 `active`；`archived / deprecated` 不可回 `active`（状态机非法抛 `[PA-004]`）；写入 `approver / approvedAt` |
| `archive(id): void` / `deprecate(id): void` | 状态迁移；重复操作抛 `[PA-004]`；未登记 id 抛 `[PA-003]` |
| `compareVersions(id, versionA, versionB): { level; scope; aVersion; bVersion; fields: string[] }` | 基于 `changeLog` 条目对比 `operator / summary / diffRef / parentVersion / reviewResult / changedAt` 六个字段，返回存在差异的字段名清单；不做文本 diff 引擎；变更记录缺失版本抛 `[PA-006]` |
| `recordChange(id, entry): void` / `getChangeLog(id): PromptChangeEntry[]` | 追加变更记录；返回深拷贝；未登记 id 抛 `[PA-003]` |
| `resolveFewShot(assetId, registry): PromptAsset[]` | 校验 `fewShotRefs` 引用资产全部存在且 `status='active'`；缺失 / 未启用抛 `[PA-005]`，错误信息含缺失引用 id 清单；主资产未登记抛 `[PA-003]` |
| `validatePromptAsset(asset): string[]` | 纯函数校验，返回错误信息数组，空数组 = 通过 |
| `createEmptyMetrics(agentId, scenario, version, window='all'): PromptMetrics` | 零值指标夹具，供登记与聚合口径对齐 |
| `getPromptAssetRegistry()` / `_resetPromptAssetRegistry()` | 进程级单例 / 测试专用重置 |

### 2.2 Schema 守卫（`src/bff/prompt/schemaGuard.ts`）

**类型契约**：

- `SchemaCheckResult { valid: boolean; errors: string[]; output: unknown }`
- `SchemaAction = 'retry' | 'template-fallback' | 'manual-queue' | 'block-submit'`
- `SchemaRetryDecision { shouldRetry: boolean; attempt: number; backoffMs: number; action: SchemaAction }`
- `SchemaGuardEvent { seq; at; assetId?; version?; attempt; valid; errors: string[]; action; agentId?; scenario? }`
- `SchemaCheckContext { assetId?; version?; agentId?; scenario?; riskLevel? }`

**接口**：

| 接口 | 契约 |
|---|---|
| `validateSchema(output, schema): SchemaCheckResult` | 轻量校验子集：`type`（object / array / string / number / boolean / null）、`required`、`properties` 对应字段类型、`enum`、根 `enum`；`additionalProperties` 不阻断；schema 缺 `type` 记录错误但不抛；结构无法判定时记错误不抛异常；不依赖 ajv |
| `planSchemaRetry(attempt, maxRetries=2, riskLevel='medium', lastError?): SchemaRetryDecision` | 重试窗口内 `shouldRetry=true`、`action='retry'`、退避 `1000 × 2^(attempt-1)`（attempt 1 → 1000ms、attempt 2 → 2000ms）；重试耗尽：`low → template-fallback`（模板兜底 + 提示人工补充）、`medium → manual-queue`（转人工确认队列，不自动回写）、`high → block-submit`（阻断提交，通知专家复核）；耗尽后 `shouldRetry=false`、`backoffMs=0` |
| `SchemaGuard.checkAndPlan(output, schema, context): SchemaRetryDecision` | 按 `assetId / agentId / scenario / default` 键维护失败计数，成功清零；每次判定写一条事件台账；`riskLevel` 取 context 传入值，缺省 `medium` |
| `SchemaGuard.listSchemaEvents(): SchemaGuardEvent[]` | 返回深拷贝事件数组 |
| `getSchemaGuard()` / `listSchemaEvents()` / `_resetSchemaGuard()` | 模块单例 / 事件查询 / 测试专用清空 |

### 2.3 指标聚合（`src/bff/prompt/metricsAggregator.ts`）

**类型契约**：

- `DisposalOutcome = 'adopted' | 'modified' | 'rejected'`
- `DisposalRecord { agentId; scenario; version; at: string; outcome: DisposalOutcome; modifiedChars?; schemaFailure? }`
- `PromptMetricQuery { agentId?; scenario?; version?; window? }`
- `AggregatedMetrics { agentId; scenario; version; window; calls; adoptionRate; modificationRate; rejectionRate; avgModifiedChars; schemaFailureRate; abnormalFlags: string[] }`
- `MetricThresholds { modificationRate?; rejectionRate?; schemaFailureRate?; avgModifiedChars? }`，默认 `0.5 / 0.3 / 0.2 / 500`。

**`PromptMetricsAggregator` 类 + 模块级单例**：

| 接口 | 契约 |
|---|---|
| `record(record): void` | 校验必填 `agentId / scenario / version / at` 与 `outcome` 枚举、`modifiedChars` 非负；非法抛 `[PM-001]` |
| `query(query?): AggregatedMetrics[]` | 按 `agentId + scenario + version` 分组聚合；`adoptionRate = 采纳 / 调用`、`modificationRate = 修改 / 调用`、`rejectionRate = 拒绝 / 调用`、`schemaFailureRate = Schema 失败 / 调用`；`avgModifiedChars` 为 modified 记录字符均值；分母为 0 时比率记 0；`window = query.window ?? 'all'`；空台账返回 `[]` |
| `listAlertFlags(): AggregatedMetrics[]` | 仅返回 `abnormalFlags` 非空的聚合组；严格 `>` 超阈值写入 `modificationRate-over-threshold / rejectionRate-over-threshold / schemaFailureRate-over-threshold / avgModifiedChars-over-threshold`（中文标识 + 英文键名） |
| `getPromptMetricsAggregator()` / `_resetPromptMetricsAggregator()` | 进程级单例 / 测试专用重置 |

### 2.4 加载链（`src/bff/prompt/promptLoader.ts`，不改动既有 `SystemPromptBuilder` 类）

**类型契约**：

- `SystemPromptContext { user: MedicalUser; department?; taskType?: MedicalTaskType; tools?: readonly BuiltMedicalTool[]; extraInstructions?; variables?: Record<string, string>; scenario?; agentId? }`；`MedicalTaskType` 从 `@/core/agent/SystemPromptBuilder.js` 复用，`MedicalUser / BuiltMedicalTool` 从 `@/types` 复用。
- `PromptLoaderDeps { registry: PromptAssetRegistry; schemaGuard?: SchemaGuard; metrics?: PromptMetricsAggregator; fallbackBuilder?: SystemPromptBuilder }`；`schemaGuard / metrics` 依赖项接受注入，本切片在加载阶段不调用（预留接入）。
- `LoadedPrompt { prompt: string; assetIds: string[]; versionRef: string[] }`。
- `PromptSecurityEvent { seq; at; type; agentId?; scenario?; message; evidence? }`。

**`loadSystemPrompt(context, deps): LoadedPrompt` 流程**：

1. **system 层强制校验**：先取 system 层 active 资产；注册表无 system 层配置时回退既有 `SystemPromptBuilder.build()` 默认文本（`assetIds=[]`、`versionRef=[]`，保证既有行为不回归）；有 system 资产但无 active 时写 `prompt-system-missing` 安全事件并抛 `[PL-001]`。
2. **层级拉取**：scenario / department / task 层按 scope 从资产库拉取 active 资产；无资产层时由既有 builder 默认文本兜底。
3. **变量替换**：`variables` 映射替换内容中 `${var}` 占位符；资产 `variables` 清单内未提供取值的变量抛 `[PL-002]`；替换后残留未解析占位符抛 `[PL-003]` 并列明占位符；system 层变量 / Few-shot 校验失败写 `prompt-system-invalid` 事件后重抛。
4. **Few-shot 校验**：按 3.4.3 ②层要求校验 `fewShotRefs` 存在且 active；引用不存在抛 `[PA-005]` 且错误信息含引用 id。
5. **system 不可覆盖**：加载器不提供传入 system 文本覆盖的入口；`extraInstructions` 固定置于末尾；system 段始终居首。
6. **版本引用**：`versionRef` 按 `prompt:${asset.version}` 口径预留，供 S-08 绑定模型 / 知识 / 平台版本四元组。
7. **安全事件台账**：`listSecurityEvents()` 返回深拷贝；`_resetPromptSecurityEvents()` 测试专用清空并复位序号。

### 2.5 出口挂接

- 新建 `src/bff/prompt/index.ts`：`export * from './assetRegistry.js'`、`'./schemaGuard.js'`、`'./metricsAggregator.js'`、`'./promptLoader.js'`；未聚合导出其他既有模块；未改动 `src/bff/index.ts` 与既有桶文件。

### 2.6 契约如实说明

- 3.4.6 建议加载器「扩展 `SystemPromptBuilder.ts`」；本切片按任务书边界保持既有类只读，加载链以独立 `promptLoader.ts` 实现，回退路径委托 `SystemPromptBuilder.build()` / `buildToolDefinitions()`；既有类与 11 例测试零改动。
- `compareVersions` 因内存台账不保留历史内容快照，基于 `changeLog` 条目字段对比，不做文本 diff 引擎；版本快照持久化与真实回滚执行归 S-06 / 后续里程碑。
- `schemaGuard` 事件字段已预留 `assetId / version / agentId / scenario`，供 `PromptMetrics.schemaFailureRate` 聚合接入；本切片加载阶段不直接写资产 metrics。

## 3. 文件清单

### 3.1 新增文件（9 个）

| 相对路径 | 行数 | 字节 | 说明 |
|---|---:|---:|---|
| `src/bff/prompt/assetRegistry.ts` | 462 | 18691 | 四层资产类型契约、`validatePromptAsset` 纯函数、`PromptAssetRegistry` 内存台账（登记 / 发布状态机 / 查询 / 归档 / 版本对比 / 变更记录 / Few-shot 校验）、单例与重置、`createEmptyMetrics` |
| `src/bff/prompt/schemaGuard.ts` | 253 | 8494 | `validateSchema` 轻量子集、`planSchemaRetry` 重试与降级决策、`SchemaGuard` 失败计数与事件台账、单例 / 事件查询 / 重置 |
| `src/bff/prompt/metricsAggregator.ts` | 195 | 7395 | 处置记录类型、`PromptMetricsAggregator` 聚合 / 阈值告警、单例与重置 |
| `src/bff/prompt/promptLoader.ts` | 262 | 9909 | 加载链上下文 / 依赖 / 结果 / 安全事件类型、`loadSystemPrompt` 强制顺序拼装、变量替换、Few-shot 校验、回退既有 builder、安全事件台账 |
| `src/bff/prompt/index.ts` | 16 | 543 | 提示词治理子系统模块统一出口，仅聚合本切片四模块 |
| `tests/unit/bff/prompt/assetRegistry.test.ts` | 343 | 14691 | 登记回读 / 深拷贝隔离 / 校验 / 状态机 / 查询兜底 / 版本对比 / 变更记录 / Few-shot 校验单测（25 例） |
| `tests/unit/bff/prompt/schemaGuard.test.ts` | 184 | 7192 | Schema 子集校验正反用例、重试退避、三级降级、事件台账与重置单测（13 例） |
| `tests/unit/bff/prompt/metricsAggregator.test.ts` | 146 | 6120 | 聚合口径 / 分母为 0 / 过滤 / 阈值告警 / 记录校验单测（8 例） |
| `tests/unit/bff/prompt/promptLoader.test.ts` | 261 | 9309 | 五层顺序 / system 强制校验与安全事件 / 变量替换 / Few-shot 校验 / system 不可覆盖 / 回退默认文本单测（8 例） |

### 3.2 修改文件（0 个）

本切片未修改任何既有源码、既有测试与既有桶文件；`src/bff/prompt/index.ts` 为新建出口桶。

绝对路径前缀：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\`

### 3.3 未改动项（回归边界）

`src/core/agent/SystemPromptBuilder.ts`、`tests/unit/core/SystemPromptBuilder.test.ts`、`src/bff/routes/promptGovernanceV5.ts`、`tests/unit/promptGovernanceV5.test.ts`、S-02 / S-03 全部源码与测试（`src/bff/agents/modelRegistry.ts`、`modelHealthProbe.ts`、`modelRouter.ts`、`index.ts` 及其测试）、`tests/unit/modelProvider.test.ts`、`src/bff/index.ts`、既有路由 / 页面 / 挂载 / 权限码 / 函数签名均未修改。

## 4. 测试与门禁结果（2026-10-26 21:00–21:03 现场复跑，退出码取自进程真实结果）

### 4.1 双 tsc 门禁

| 门禁 | 命令（仓库根 / web 目录分别执行） | 退出码 | 日志 | 日志大小 |
|---|---|---:|---|---:|
| 根目录 | `node node_modules/typescript/bin/tsc --noEmit` | **0** | `logs/s04-tsc-root-20261026-2107.log` | 0 字节（零错误） |
| web 目录 | `bun x tsc --noEmit`（cwd=`web`） | **0** | `logs/s04-tsc-web-20261026-2107.log` | 0 字节（零错误） |

> 修复过程留痕：首轮根 tsc 报 2 处类型错误（`schemaGuard.test.ts` 未导入 `getSchemaGuard`；`promptLoader.test.ts` 用户夹具缺 `hasPrescriptionRight` 字段且需 `as unknown as MedicalUser`），就地修复后复跑清零；中间失败日志 `logs/s04-tsc-root-20261026-2059.log`、早期绿灯日志 `logs/s04-tsc-root-20261026-2100.log`、`logs/s04-tsc-web-20261026-2101.log` 留存备查；上表 2107 日志为切片记录落盘后的最终复跑结果。

### 4.2 新增单测

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/bff/prompt/assetRegistry.test.ts` | 25 pass | 0 fail | 60 | 986.00ms | `logs/s04-assetRegistry-test-20261026-2100.log` |
| `tests/unit/bff/prompt/schemaGuard.test.ts` | 13 pass | 0 fail | 47 | 953.00ms | `logs/s04-schemaGuard-test-20261026-2100.log` |
| `tests/unit/bff/prompt/metricsAggregator.test.ts` | 8 pass | 0 fail | 24 | 916.00ms | `logs/s04-metricsAggregator-test-20261026-2100.log` |
| `tests/unit/bff/prompt/promptLoader.test.ts` | 8 pass | 0 fail | 28 | 964.00ms | `logs/s04-promptLoader-test-20261026-2100.log` |

### 4.3 既有回归（不得回归项，数字与 S-02 / S-03 复核基线一致）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/core/SystemPromptBuilder.test.ts` | 11 pass | 0 fail | 21 | 1031.00ms | `logs/s04-regression-systempromptbuilder-20261026-2101.log` |
| `tests/unit/promptGovernanceV5.test.ts` | 5 pass | 0 fail | 7 | 941.00ms | `logs/s04-regression-promptgovernancev5-20261026-2101.log` |
| `tests/unit/bff/agents/modelRegistry.test.ts` | 36 pass | 0 fail | 106 | 955.00ms | `logs/s04-regression-modelregistry-20261026-2103.log` |
| `tests/unit/bff/agents/modelHealthProbe.test.ts` | 12 pass | 0 fail | 48 | 1445.00ms | `logs/s04-regression-modelhealthprobe-20261026-2103.log` |
| `tests/unit/bff/agents/modelRouter.test.ts` | 36 pass | 0 fail | 109 | 918.00ms | `logs/s04-regression-modelrouter-20261026-2103.log` |
| `tests/unit/modelProvider.test.ts` | 4 pass | 0 fail | 20 | 1020.00ms | `logs/s04-regression-modelprovider-20261026-2101.log` |

> 模型域三份合并执行留痕：`logs/s04-regression-modeldomain-20261026-2101.log`，合计 84 pass / 0 fail / 263 expect / 1463.00ms（36 + 12 + 36；106 + 48 + 109），与基线完全吻合。

### 4.4 测试覆盖要点

**`assetRegistry.test.ts`（25 例）**：

- 登记回读与深拷贝隔离（3 例）：注册成功 `getAsset` 回读字段一致；重复 id 抛 `[PA-002]`；修改返回对象不影响台账。
- 校验（6 例）：合法资产空错误；非法 `level / riskLevel / status` 枚举；必填 `id / name / content / owner / version` 为空；`variables / fewShotRefs` 非字符串数组；`active` 缺 `approver / approvedAt`；`register` 汇总 `[PA-001]`。
- 发布状态机（4 例）：`draft` 评审通过发布 `active` 并写审批人 / 变更记录；`reviewResult='rejected'` 抛 `[PA-004]`；`archived / deprecated` 不可回 `active`；`archive / deprecate` 迁移与重复操作拒绝。
- 查询（5 例）：scenario 精确命中；科室空 / `all` 全院兜底；同 scope 多条 active 取最新 `updatedAt`；五类过滤器分别命中；未登记返回 `undefined`。
- 版本对比与变更记录（4 例）：`compareVersions` 返回差异字段清单且不含相等字段；缺失版本抛 `[PA-006]`；`recordChange` 追加与 `getChangeLog` 深拷贝隔离；未登记 id 抛 `[PA-003]`。
- Few-shot（3 例）：全部 active 返回示例清单；缺失 / draft 引用抛 `[PA-005]` 且错误信息含引用 id；主资产未登记抛 `[PA-003]`。

**`schemaGuard.test.ts`（13 例）**：

- `validateSchema`（7 例）：合法输出通过；缺 required；类型错误；enum 越界；array 非数组；根 enum + additionalProperties 不阻断；schema 缺 type 记错不抛。
- `planSchemaRetry`（2 例）：attempt 1 / 2 退避 1000ms / 2000ms；耗尽按 low / medium / high 分别落到 `template-fallback / manual-queue / block-submit`。
- `SchemaGuard` 事件台账（4 例）：合法输出事件 `valid=true / attempt=0 / action=retry`；medium 失败序列 retry → retry → manual-queue 且错误落盘；成功后计数清零；单例事件台账与 `_resetSchemaGuard` 清空。

**`metricsAggregator.test.ts`（8 例）**：

- 聚合口径（3 例）：4 次处置比率 / 均值 / Schema 失败率计算正确；空台账返回 `[]`；按 `agentId / scenario / version` 精确过滤、`window` 标签透传。
- 阈值告警（3 例）：四类超阈值 flag 全触发；`listAlertFlags` 只返回告警组；未超阈值无 flag。
- 记录校验（2 例）：缺 `agentId / scenario / version / at` 抛 `[PM-001]`；`outcome` 非法、`modifiedChars` 负数抛 `[PM-001]`。

**`promptLoader.test.ts`（8 例）**：

- 五层顺序（1 例）：system < scenario < department < task < 可用工具；`assetIds` 四层齐全；`versionRef` 四条均 `prompt:` 前缀。
- system 强制校验（3 例）：draft system 抛 `[PL-001]` 且事件 `prompt-system-missing` 带 scenario / agentId；缺变量抛 `[PL-002]` + `prompt-system-invalid` 事件；残留 `${unknownVar}` 抛 `[PL-003]` 并列明占位符。
- Few-shot（2 例）：缺失引用抛 `[PA-005]` 含 id；draft 引用抛 `[PA-005]`。
- system 不可覆盖（1 例）：补充说明居末、system 段居首，加载器无外部 system 覆盖入口。
- 无资产库回退（1 例）：空注册表回退既有 builder 默认文本，伦理层与品牌标识保留，`assetIds / versionRef` 为空。

### 4.5 工程合规自查

- 未引用 `package.json` 未安装依赖；TypeScript strict；ESM；`@/` 别名 + `.js` 后缀；新公共符号经 `src/bff/prompt/index.ts` 出口。
- 未执行 `git add` / `git commit` / `git push` / 打 tag；提交分组与双仓推送由主会话收口。
- 新代码 / 注释 / 测试 / 日志扫描：未出现品牌规范禁用代号（`gang-os`、`gangos-`、`Gang-OS`、`GangOS`、`Jianlan OS`、`杠OS`、`建兰`）与「数智医院」旧称；未出现明文端点、鉴权头、访问密钥、访问令牌、账号口令；资产夹具仅使用演示占位标识。
- 测试数据为内置演示主数据 / 合成数据；无院方实名；日志不含大段患者文本。
- 证据日志位于 `logs/`（已 gitignore）。

## 5. 遗留风险

1. **进程内存台账**：资产台账、变更记录、Schema 事件、指标分组、安全事件均为进程内存态，重启丢失；持久化表结构与事件落库归后续里程碑（S-06 / S-08 收口）。
2. **静态加密未落地**：`encrypted` 仅为归属标记，可插拔加密器接口预留、默认透传；医院侧真实静态加密与密钥管理归后续安全切片。
3. **版本对比为条目级**：`compareVersions` 基于 `changeLog` 字段对比，不保留历史内容快照、不做文本 diff；真实内容回滚执行与快照持久化归 S-06 及后续里程碑。
4. **schemaGuard / metrics 未在加载阶段接线**：`PromptLoaderDeps` 已接受注入，模型输出校验发生在输出侧（S-01 `outputGuard` 与后续 Schema 节点）；加载阶段仅做资产登记侧校验，事件 → `PromptMetrics.schemaFailureRate` 的聚合回写待输出侧链路打通后接入。
5. **硬编码伦理层未迁移**：`SystemPromptBuilder.ETHICS_LAYER` 保持既有兜底；既有岗位提示词向资产库迁移需全量回归，台账 S-04 已标注该风险，迁移动作归后续切片。
6. **Schema 校验为轻量子集**：仅覆盖 `type / required / properties / enum`，`pattern / minimum / maxLength / items / oneOf` 等关键字未实现；与 `zod` / 完整 JSON Schema 的映射口径待后续扩展。
7. **任务层动态上下文未建模**：患者信息、已有病历内容、光标位置段落等运行时增量上下文（P-04）属 S-05；当前 task 层仅支持静态资产 + 模板变量。
8. **四元组版本绑定预留**：`versionRef` 仅落 `prompt:version`；模型版本、知识版本、平台版本的同记录绑定归 S-08 审计链收口。

## 6. 下一切片建议（S-06 方向）

1. **两套注册表统一方案**：按台账 S-06（第 351 行）将 `AgentRegistry` 智能体元数据与本切片 `PromptAssetRegistry` 字段映射表成文；评审模式先行，避免既有 BFF 调用面一次性迁移。
2. **元数据合并口径**：智能体 `systemPrompt` 引用 ②③ 层资产的解析规则、风险等级映射、三级评测门禁与提示词 `riskLevel / status` 的对应关系建议在 S-06 定型。
3. **持久化对齐**：资产台账、变更记录、指标聚合组的表结构设计可与 S-02 模型注册表、S-03 规则台账一并规划，避免三套内存台账各自落库造成口径分裂。
4. **指标接入**：S-06 评测门禁调用本切片 `PromptMetricsAggregator.query / listAlertFlags` 形成「指标异常 → 版本评审任务」闭环；`schemaGuard` 事件与 `schemaFailureRate` 的回写在输出侧链路打通后补齐。
5. 后续切片接入 BFF 路由与前端时，直接复用本切片纯函数与内存台账接口；`getActiveAsset` 的 scope 匹配规则（精确 → `all` 兜底 → 最新 `updatedAt`）需在路由层保持一致。

## 7. 未闭环项

无阻塞项。本切片范围内契约、单测、双 tsc 门禁全部闭环；1.3 节列明的 P-04 / P-06 / P-07(S-12)、BFF 路由与前端页面、静态加密、持久化落库均属后续切片范围，未在本切片提前实现。2.6 节记录的加载器独立于既有 `SystemPromptBuilder` 类实现、`compareVersions` 条目级对比为任务书边界内的如实口径，未改变既有源码语义与对外行为。

# S-06 切片记录：智能体准入元数据与三类评测门禁

- **切片编号**：S-06
- **产品口径**：健澜AI原生医院操作系统OS
- **署名**：杭州健澜科技有限公司
- **基线仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`，基线 HEAD `1d0dc546e5d32e42dc8313d4601cb09a8f72abe6`
- **实现形态**：纯类型 + 纯函数 + 进程内存（`Map`），离线闭环；不接 DB、不发起网络请求、不执行真实评测；测试使用 demo 合成夹具，无院方实名、无明文端点、无密钥口令。

## 1. 目标与契约依据

### 1.1 技术文档章节（`docs/technical/YXS20261026-development-spec-2026-10-26.md`）

| 章节 | 行号 | 落地内容 |
|---|---|---|
| 3.5.2 统一智能体元数据（S-06，ADR-01 两步合并） | 547–594 | `AgentRecord` / `DataScope` / `ToolBinding` / `InterfaceInventory` 等类型契约；第一步：统一类型 + 映射视图，DB 仍为权威、内存为缓存 |
| 3.5.3 准入与评测门禁 | 596–608 | 准入申请字段、三类评测台账（功能 / 质量 / 安全对抗）、门禁规则：评测缺失、任一不达标、风险等级与复核角色不匹配时禁止置 `active`；评测集版本与智能体版本绑定归档 |
| 3.5.4 运行监控指标 | 610–622 | 调用量 / 采纳率 / 修改率 / 拒绝率 / 平均修改字数 / 异常分类计数，按 智能体 × 版本 × 场景 × 科室 × 时间窗聚合 |
| 3.5.5 灰度发布与退役 | 624–644 | `DeploymentPolicy` 五维配置结构；退役状态机 `active → paused → retired`，退役留痕（下线时间、原因、替代智能体、归档包引用），退役版本不可再被新任务调用 |
| 3.5.6 验收标准 | 646–648 | 准入字段完整性校验单测；三类评测缺失 / 不达标禁止发布；指标按三维聚合可查询；退役留痕可检索；两套注册表映射视图一致；既有智能体声明包与岗位智能体加载不回归 |

### 1.2 差距矩阵（`docs/research/YXS20261026-gap-matrix-2026-10-26.md`）

| 编号 | 行号 | 差距说明 | 本切片落地 |
|---|---|---|---|
| A-01 | 223 | 准入台账缺责任人 / 部门归属 / 数据范围 / 输出类型 / 模型知识依赖接口清单 | `AgentRecord` 字段全集 + `validateAgentRecord` 完整性与枚举校验；映射视图标注两套注册表缺失必填项 |
| A-02 | 224 | 三级风险与复核角色映射未台账化；`medical-record-qc` 定级口径待校准 | `riskLevel` 三级枚举 + `reviewRole` 门禁映射（high=专家复核 `expert-review`，medium=医师确认 `physician-confirm`，low 可抽检）；定级不一致项登记为遗留风险 |
| A-03 | 225 | 无三类评测台账；发布动作不挂评测门禁 | `EvaluationReportRef` 三类台账 + `recordEvaluation` / `getEvaluation`；`activate` 先跑门禁再落状态，任一不满足抛 `[ADM-005]` 且状态保持不变 |
| A-04 | 226 | 指标需按 agentId + version + 场景 + 时间窗聚合，异常分类计数 | `recordRuntimeMetrics` / `queryRuntimeMetrics` 按 `agentId::version::scenario::department` 分组，五类异常分类计数，分母为 0 比率记 0 |
| A-06 | 228 | 无退役状态机、退役台账与归档检索 | 状态机 `draft → review → staging → active → paused → retired`，`active ↔ shadow`；`retire` 写 `retiredInfo` 与退役变更记录；`isCallable` 仅 `active/shadow` 为 true |
| A-07 | 229 | 两套注册表字段不对齐、职责重叠 | `mapBffEntry` / `mapDeclarativeDefinition` / `buildMappingView` 统一投影视图 + `missingRequired` + `fieldCoverage`；只投影不反向写入源注册表 |

### 1.3 切片台账

- 台账 S-06（第 351 行）：智能体准入与评测门禁——元数据补全、三级风险映射、三类评测台账、发布前门禁、退役状态机、两套注册表统一方案（架构决策先行）；验收口径：未过评测禁止发布、准入字段完整校验、退役留痕可查、两套注册表字段映射表成文；依赖 S-02、S-05；双注册表合并分两步迁移。

## 2. 输入输出契约

### 2.1 输入（本切片消费，不改动语义）

- S-02 模型注册表单例 `getModelRegistry()` / `ModelCard` / `ModelHealthSnapshot`（`src/bff/agents/modelRegistry.ts`）：`modelBinding.cardId` / `fallbackCardId` 仅存引用标识，不在本切片解析。
- S-03 策略路由规则 `routeRuleId`（`src/bff/agents/modelRouter.ts`）：仅存引用标识。
- S-04 提示词资产 id（`src/bff/prompt/assetRegistry.ts`）：`promptAssets.system/scenario/department/task` 仅存引用标识。
- 既有 BFF 岗位注册表 `src/bff/agents/agentRegistry.ts`（静态 `AGENT_REGISTRY`，DB `clinical.medmuse_agents` 权威）：只读投影。
- 既有声明式注册表 `src/orchestrator/agent/AgentRegistry.ts` 与 `AgentDefinition`（`src/orchestrator/dsl/types.ts`）：只读投影。

### 2.2 输出（本切片新增公共符号，经 `src/bff/agents/index.ts` 出口）

**类型**：`AgentOutputType`、`AgentRiskLevel`、`AgentStatus`、`PatientScope`、`ToolRiskLevel`、`EvaluationKind`、`AbnormalKind`、`DataScope`、`ToolBinding`、`InterfaceInventory`、`ModelBindingRef`、`PromptAssetBinding`、`SchemaRef`、`EvaluationReport`、`EvaluationReportRef`、`DeploymentPolicy`、`AgentChangeEntry`、`AgentRetiredInfo`、`AgentRecord`、`AgentRecordFilter`、`AgentRegistryEntryLike`、`DeclarativeDefinitionLike`、`AgentRecordView`、`UnifiedAgentView`、`RuntimeMetricsInput`、`AgentRuntimeMetrics`、`RuntimeMetricsFilter`。

**常量**：`EXPERT_REVIEW_ROLE = 'expert-review'`、`PHYSICIAN_CONFIRM_ROLE = 'physician-confirm'`、`ADMISSION_REQUIRED_FIELDS`（11 个准入必填键）。

**纯函数**：`isValidAgentStatusTransition(from, to)`、`validateAgentRecord(record)`、`mapBffEntry(entry)`、`mapDeclarativeDefinition(def)`、`buildMappingView(bffEntries, declarativeDefs)`。

**类**：`AgentAdmissionRegistry`，方法 `register` / `getAgent` / `getAgentOrThrow` / `listAgents` / `submitForReview` / `approve` / `activate` / `recordEvaluation` / `getEvaluation` / `pause` / `retire` / `isCallable` / `recordChange` / `getChangeLog` / `recordRuntimeMetrics` / `queryRuntimeMetrics`。

**单例**：`getAgentAdmissionRegistry()`、`_resetAgentAdmissionRegistry()`（测试重置）。

**错误码**：`[ADM-001]` 记录校验未通过；`[ADM-002]` 重复 id；`[ADM-003]` 未登记；`[ADM-004]` 非法状态迁移（含合法出边提示）；`[ADM-005]` 准入门禁阻断；`[ADM-006]` 评测报告校验未通过；`[ADM-007]` 运行指标入参校验未通过。

### 2.3 状态机

```text
draft → review → staging → active → paused → retired
                      active ↔ shadow
retired 为终态，禁止再迁移
```

### 2.4 准入门禁（`activate`，staging → active 时先校验再落状态）

1. 功能评测记录存在、`passed=true`、`passedCount / caseCount ≥ 0.95`；
2. 质量评测记录存在且 `passed=true`；
3. 安全对抗评测记录存在且 `passed=true`；
4. `high` 必须 `reviewRole='expert-review'`；`medium` 必须 `reviewRole='physician-confirm'`；`low` 不强制复核角色；
5. 任一门槛不满足抛 `[ADM-005]` 并列全部不满足项，状态保持 `staging` 不变。

> 核心用例 100% / 非核心 ≥95% 的分组口径（3.5.3 表 604 行）：本切片以整体通过率 95% 为门槛，`details` 字段预留核心 / 非核心分组明细，登记为后续评审校准项（见第 7 节）。

## 3. 新增 / 修改文件清单（实测行数与字节）

| 操作 | 路径 | 行数 | 字节 | 说明 |
|---|---|---:|---:|---|
| 新增 | `src/bff/agents/agentAdmission.ts` | 966 | 36973 | 类型契约、状态机、`validateAgentRecord`、`AgentAdmissionRegistry`、映射视图三函数、运行指标聚合、单例 / 重置 |
| 修改 | `src/bff/agents/index.ts` | 17 | 651 | 在 `modelRegistry` / `modelHealthProbe` / `modelRouter` 三条导出后追加 `export * from './agentAdmission.js'`；头部注释更新；未聚合导出其他既有模块 |
| 新增 | `tests/unit/bff/agents/agentAdmission.test.ts` | 564 | 27862 | bun:test 单测，8 个 describe 共 27 例 |
| 新增 | `reports/slices/S-06-agent-admission/slice-record.md` | 192 | 20457 | 本切片记录（含两套注册表字段对照附录） |

> 未改动：`src/bff/agents/agentRegistry.ts`、`src/orchestrator/agent/AgentRegistry.ts`、`src/orchestrator/dsl/types.ts`、`src/core/coordinator/AgentRegistry.ts`、既有路由 / 页面 / 挂载 / 权限码 / 函数签名，以及 S-02 / S-03 / S-04 全部源码与测试。

## 4. 测试清单与结果

### 4.1 新增测试（S-06）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/bff/agents/agentAdmission.test.ts` | 27 | 0 | 119 | 998 ms | `logs/s06-admission-test-20261026-2130.log` |

覆盖用例分组：

- **登记校验**：注册成功回读；重复 id 拒绝（`[ADM-002]`）；必填缺失 / 枚举非法 / dataScope / tools / interfaces 结构非法 / `trafficPercent` 越界；缺省补 `deployment` 空配置、`changeLog=[]`、`evaluation={}`、`status='draft'`；深拷贝隔离。
- **准入门禁**：无评测记录禁止置 active 且状态保持 staging；功能 / 质量 / 安全任一缺失分别阻断；功能未通过、通过率 <95%、质量未通过、安全对抗未通过分别阻断；high 缺专家角色、medium 缺医师角色阻断；三类齐全且通过后置 active 并追加发布变更记录；low 风险无需复核角色。
- **状态机**：合法迁移逐条通过；非法迁移抛 `[ADM-004]` 含合法出边提示；`retired` 终态不可再迁；`pause` 写 `paused`；`retire` 写 `retiredInfo`（时间 / 原因 / 替代智能体 / 归档引用）与退役变更记录；`isCallable` 仅 `active/shadow` 为 true。
- **评测台账**：三类分别登记、`getEvaluation` 回读并保留评测集版本；未登记 id 抛 `[ADM-003]`；报告结构非法抛 `[ADM-006]`；深拷贝隔离。
- **映射视图**：BFF 岗位条目投影 `source='bff-role'`、`roleCode`、名称、工具清单；声明包投影 `source='declarative-package'`、分类、风险等级、author→owner 覆盖度；`buildMappingView` 合并两套；不反向写入源对象。
- **运行指标**：采纳 / 修改 / 拒绝 / 修改字符 / 异常分类聚合口径正确；按 agentId / version / scenario / department / window 过滤；空台账返回空数组；五类异常分别累计；分母为 0 比率记 0；入参缺失与负字符数抛 `[ADM-007]`。

### 4.2 既有回归（数字不劣化，未修改这些测试与对应源码；最终复跑 2131 批次，全部 exit=0）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/coordinator/AgentRegistry.test.ts` | 8 | 0 | 13 | 881 ms | `logs/s06-regression-coordinator-agentregistry-20261026-2131.log` |
| `tests/unit/orchestrator/agents.load.test.ts` | 24 | 0 | 114 | 2.04 s | `logs/s06-regression-orchestrator-load-20261026-2131.log` |
| `tests/unit/orchestrator/agents.exec.test.ts` | 3 | 0 | 10 | 1203 ms | `logs/s06-regression-orchestrator-exec-20261026-2131.log` |
| `tests/unit/core/SystemPromptBuilder.test.ts` | 11 | 0 | 21 | 1098 ms | `logs/s06-regression-systemprompt-20261026-2131.log` |
| `tests/unit/promptGovernanceV5.test.ts` | 5 | 0 | 7 | 895 ms | `logs/s06-regression-promptgov5-20261026-2131.log` |
| `tests/unit/bff/agents/modelRegistry.test.ts` | 36 | 0 | 106 | 938 ms | `logs/s06-regression-modelregistry-20261026-2131.log` |
| `tests/unit/bff/agents/modelHealthProbe.test.ts` | 12 | 0 | 48 | 1447 ms | `logs/s06-regression-modelprobe-20261026-2131.log` |
| `tests/unit/bff/agents/modelRouter.test.ts` | 36 | 0 | 109 | 954 ms | `logs/s06-regression-modelrouter-20261026-2131.log` |
| `tests/unit/modelProvider.test.ts` | 4 | 0 | 20 | 1030 ms | `logs/s06-regression-modelprovider-20261026-2131.log` |
| `tests/unit/bff/prompt/assetRegistry.test.ts` | 25 | 0 | 60 | 931 ms | `logs/s06-regression-prompt-asset-20261026-2131.log` |
| `tests/unit/bff/prompt/schemaGuard.test.ts` | 13 | 0 | 47 | 924 ms | `logs/s06-regression-prompt-schema-20261026-2131.log` |
| `tests/unit/bff/prompt/metricsAggregator.test.ts` | 8 | 0 | 24 | 935 ms | `logs/s06-regression-prompt-metrics-20261026-2131.log` |
| `tests/unit/bff/prompt/promptLoader.test.ts` | 8 | 0 | 28 | 1053 ms | `logs/s06-regression-prompt-loader-20261026-2131.log` |

> 说明：S-04 四份提示词测试在 S-06 任务书回归清单之外，本轮一并复跑，确认桶文件追加导出未造成提示词域回归。首轮 2125 批次日志（同目录 `*-20261026-2125.log`）为过程留痕，最终数字以 2131 批次为准；逐项 exit/pass/fail/expect 汇总落盘于 `logs/s06-regression-final.txt`。

## 5. 双 tsc 门禁

| 门禁 | 命令（工作目录） | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit`（仓库根） | 0 | `logs/s06-tsc-root-20261026-2128.log` | 0 |
| web tsc | `bun x tsc --noEmit`（`web/` 目录） | 0 | `logs/s06-tsc-web-20261026-2128.log` | 0 |

> 过程留痕：首轮根 tsc 曾因 `agentAdmission.ts` 导出 `isValidStatusTransition` 与 S-02 `modelRegistry.ts` 同名符号在桶文件 `export *` 下冲突（TS2308），已将本切片纯函数更名为 `isValidAgentStatusTransition` 后复跑清零；过程日志 `logs/s06-tsc-root-20261026-2121.log`（199 字节，退出码 2）为失败留痕，`logs/s06-tsc-root-20261026-2122.log`、`logs/s06-tsc-web-20261026-2123.log` 为修复后中间清零记录；最终门禁以 2128 两份 0 字节日志为准。

## 6. 附录：两套注册表 → 统一元数据字段对照清单（A-07 / 台账 S-06 成文项）

| 统一 `AgentRecord` 字段 | BFF 岗位 `AgentRegistryEntry`（体系 A，DB 权威） | 声明式 `AgentDefinition`（体系 B，内存态） | 映射口径 |
|---|---|---|---|
| `id` | `roleCode`（岗位角色编码） | `id`（小写中划线包 ID） | 直接投影为 `sourceId` |
| `name` | `name` | `name` | 直接投影 |
| `nameEn` | 无 | `nameEn?` | 声明包有则投影，岗位侧缺失 |
| `version` | 无（岗位注册表无版本字段） | `version`（SemVer） | 岗位侧缺失，准入必填 |
| `category` | 无 | `category` | 声明包投影 |
| `tags` | 无 | `tags` | 声明包投影 |
| `description` | `painPoint` / `dailyProductivityGain` 可衍生 | `description` | 岗位侧按衍生处理，覆盖度记 false |
| `department` | 无（岗位 ≠ 科室归属） | `allowedRoles`（适用角色，不等价） | 两套源均不直接提供，准入必填缺失 |
| `owner` | 无 | `author?`（作者 / 维护团队） | 声明包按 `author` 计覆盖度；岗位侧缺失 |
| `approver` | 无 | 无 | 门禁审批时由 `approve(id, approver)` 回填 |
| `scenario` | 无 | `category` / `tags` 可衍生 | 准入必填，两套源均缺失 |
| `dataScope` | 无 | 无 | 准入必填，两套源均缺失，需补登记 |
| `outputType` | 无 | 无 | 准入必填，两套源均缺失 |
| `riskLevel` | 无 | `riskLevel`（low/medium/high） | 声明包投影；岗位侧缺失 |
| `reviewRole` | 无 | 无 | 门禁按风险等级匹配，未在源注册表建模 |
| `tools` | `allowedTools`（工具白名单） | `tools`（工具名称数组） | 数组非空即覆盖 |
| `knowledgeBases` | 无 | `knowledgeBases?` | 声明包数组非空即覆盖 |
| `modelBinding` | 无 | `model`（`ModelConfig` 对象） | 声明包对象存在即覆盖；岗位侧缺失 |
| `promptAssets` | `defaultSystemPrompt`（内联系统提示词） | `systemPrompt`（内联或文件引用） | 仅提示词文本存在，未绑定 S-04 资产 id / 版本 |
| `entryWorkflow` | 无 | `entryWorkflow`（工作流 DAG ID） | 声明包投影 |
| `inputSchema` | 无 | `inputSchema?`（JSON Schema 对象） | 声明包侧为原始对象，统一类型为 `SchemaRef { ref, version? }`，映射时不做结构转换 |
| `outputSchema` | 无 | 无（声明包未独立建模输出 Schema 引用） | 缺失 |
| `interfaces` | 无 | 无 | 准入必填，两套源均缺失，需补登记 |
| `evaluation` | 无 | 无 | 三类评测台账在本切片内存模型中维护，源注册表未建模 |
| `status` | 无（岗位注册表无启停状态字段，DB 权威侧另管） | `enabled`（布尔，非状态机状态） | 不等价；统一状态机七态由本切片 `AgentRecord.status` 承载 |
| `deployment` | 无 | 无 | 五维灰度配置仅登记结构与校验，分流执行归 S-07 |
| `changeLog` | 无 | 无 | 本切片内存台账维护 |
| `retiredInfo` | 无 | 无 | 本切片退役留痕字段 |

> 映射实现见 `agentAdmission.ts` 的 `mapBffEntry` / `mapDeclarativeDefinition`；`missingRequired` 按 `ADMISSION_REQUIRED_FIELDS`（`name / department / owner / scenario / dataScope / outputType / riskLevel / modelBinding / knowledgeBases / tools / interfaces`）逐项输出 `fieldCoverage` 布尔。第二步（写入层收敛到统一仓储、内存 Map 作为启动缓存、既有 BFF 调用面兼容迁移）归后续切片，本切片不反向写入两套源注册表。

## 7. 遗留风险与后续建议

### 7.1 本切片已预留但未闭环项（不谎称通过）

1. **灰度五维分流执行（A-05，S-07）**：`DeploymentPolicy.dimensions` 仅登记配置结构与 `trafficPercent ∈ [0,100]` 校验；科室 / 医师 / 文书类型 / 患者分组 / 流量比例的运行时哈希分流、新旧版本并行指标对照、开关回滚与版本指针回滚均归 S-07。
2. **写入层收敛与 DB 仓储（ADR-01 第二步）**：本切片为进程内存 `Map` 缓存；统一智能体元数据落库、与 DB `clinical.medmuse_agents` 权威表对齐、两套注册表写入侧合并归后续切片；当前不产生任何 DB 读写。
3. **指标落库与告警动作（A-04）**：`queryRuntimeMetrics` 为内存聚合；指标落库到智能体维度、修改率 / 拒绝率 / 异常率超阈值告警、触发智能体降级或暂停建议归后续切片；3.5.4 表中「人工干预点（挂起 / 确认 / 退回次数与节点位置，工作流节点 × 智能体版本）」本切片未建模，随 S-05 编排事件落库一并补齐。
4. **功能评测分组口径校准**：3.5.3 要求核心用例通过率 100%、非核心 ≥95%；本切片以整体通过率 ≥95% 为门槛，`EvaluationReport.details` 预留分组明细，待评审方案落地核心 / 非核心用例清单后细化门禁。
5. **风险定级待校准（A-02）**：既有 `medical-record-qc` 标 `low` 与方案「质控结论属高风险需专家复核」口径不一致；本切片不改动既有声明包定级，登记由医务部 / 架构组评审后统一校准。
6. **四元组版本绑定（S-08）**：`modelBinding` / `promptAssets` / `knowledgeBases` / `entryWorkflow` 仅存引用标识；模型 / 知识 / 提示词 / 发布版本四元组绑定与 AI 审计链留痕归 S-08。
7. **接口清单与免责声明**：3.5.3 准入申请字段含免责声明，`AgentRecord` 未单列 `disclaimer` 字段；当前并入 `description` / `reviewRole` 评审记录承载，待与既有 `AgentDefinition.disclaimer` 口径对齐后补字段。

### 7.2 对 S-08（AI 审计链路）的建议接口预留

- `AgentRecord.changeLog`、`retiredInfo`、`EvaluationReportRef` 已按审计留痕结构组织；S-08 可直接按 `agentId + version` 聚合发布 / 评测 / 退役记录入审计链。
- `RuntimeMetricsInput` 的 `abnormalKind` 五类（`timeout / circuit-open / schema-failure / manual-handover / tool-error`）可直接复用为 S-08 人工干预点与异常事件分类口径。
- 建议 S-08 发布事件绑定四元组：`modelBinding.cardId + knowledgeBases[] + promptAssets 各层资产 id@version + deployment.baselineAgentVersion`。

### 7.3 工程自检记录

- TypeScript strict、ESM、`@/*` 别名 + `.js` 后缀；未新增依赖（仅使用已装 `zod` 之外的手写轻量校验，与 S-04 口径一致）。
- 本地开发态未执行 `git add / commit / push / tag`；未删除用户源码；未移动 / 重命名既有文件；未清理历史 backlog。
- 代码 / 测试 / 日志 / 文档无真实密码、token、密钥与明文端点；测试夹具为合成演示数据，无院方实名、无大段患者文本。

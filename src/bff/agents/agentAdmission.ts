/**
 * 健澜AI原生医院操作系统OS - bff/agents/agentAdmission.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 智能体准入与评测门禁（技术文档 3.5.2 统一智能体元数据、3.5.3 准入与评测门禁、
 * 3.5.4 运行监控指标、3.5.5 灰度发布与退役、3.5.6 验收标准）：统一元数据类型与
 * 校验规则、三类评测台账、发布前准入门禁、退役状态机、两套注册表映射视图、
 * 运行指标三维聚合。
 *
 * 本切片（S-06）为进程内存实现，DB 仍为权威、内存为缓存；写入层收敛到统一仓储
 * 归后续切片。灰度五维流量运行时分流执行归 S-07；模型/知识/提示词版本四元组绑定
 * 归 S-08；本模块不接 DB、不发起网络请求、不执行真实评测。
 *
 * @module bff/agents/agentAdmission
 */

// ============================================================================
// 类型契约（对齐技术文档 3.5.2）
// ============================================================================

/** 智能体输出类型 */
export type AgentOutputType =
  | 'question-answer'
  | 'summary'
  | 'clinical-note'
  | 'qc-conclusion'
  | 'suggestion'
  | 'report';

/** 三级风险等级（A-02：低问答摘要 / 中文书生成医师确认 / 高质控结论与诊疗建议专家复核） */
export type AgentRiskLevel = 'low' | 'medium' | 'high';

/** 智能体状态集（3.5.2 状态集；3.5.5 退役链） */
export type AgentStatus =
  | 'draft'
  | 'review'
  | 'staging'
  | 'active'
  | 'shadow'
  | 'paused'
  | 'retired';

/** 患者数据可读范围 */
export type PatientScope = 'own-visit' | 'own-department' | 'hospital-wide';

/** 工具风险等级（与工具确认口径对齐：只读 / 需确认 / 需双确认） */
export type ToolRiskLevel = 'read-only' | 'confirm' | 'double-confirm';

/** 评测类别（3.5.3 三类评测台账） */
export type EvaluationKind = 'functional' | 'quality' | 'security';

/** 异常事件分类（3.5.4 异常率分类计数） */
export type AbnormalKind =
  | 'timeout'
  | 'circuit-open'
  | 'schema-failure'
  | 'manual-handover'
  | 'tool-error';

/** 可读数据范围（系统 / 表 / 字段 / 患者标识级） */
export interface DataScope {
  systems: string[];
  tables: string[];
  fields: string[];
  patientScope: PatientScope;
  externalExport: boolean;
}

/** 工具绑定：工具标识、风险等级、配额 */
export interface ToolBinding {
  toolId: string;
  riskLevel: ToolRiskLevel;
  quota: { callsPerMinute?: number; callsPerVisit?: number };
}

/** 依赖外部接口清单（准入附件） */
export interface InterfaceInventory {
  systemId: string;
  endpoint: string;
  operation: string;
  purpose: string;
}

/** 模型绑定引用（指向 S-02 模型卡片 / S-03 路由规则，不落明文端点与密钥） */
export interface ModelBindingRef {
  cardId?: string;
  routeRuleId?: string;
  fallbackCardId?: string;
}

/** 提示词资产绑定（指向 S-04 资产 id 与版本） */
export interface PromptAssetBinding {
  system?: string;
  scenario?: string;
  department?: string;
  task?: string;
}

/** Schema 引用（引用标识 + 版本） */
export interface SchemaRef {
  ref: string;
  version?: string;
}

/** 单类评测报告（评测集版本、用例数、通过 / 失败、执行人、日期、结论） */
export interface EvaluationReport {
  evaluationSetVersion: string;
  caseCount: number;
  passedCount: number;
  failedCount: number;
  executor: string;
  evaluatedAt: string;
  summary: string;
  passed: boolean;
  details?: string;
}

/** 三类评测记录归档 */
export interface EvaluationReportRef {
  functional?: EvaluationReport;
  quality?: EvaluationReport;
  security?: EvaluationReport;
}

/** 五维灰度配置（3.5.5；本切片仅登记配置与校验，分流执行归 S-07） */
export interface DeploymentPolicy {
  dimensions: {
    departments: string[];
    clinicians: string[];
    documentTypes: string[];
    patientGroups: string[];
    trafficPercent: number;
  };
  switches: Record<string, boolean>;
  baselineAgentVersion: string;
}

/** 智能体变更记录条目 */
export interface AgentChangeEntry {
  version: string;
  changedAt: string;
  operator: string;
  summary: string;
  parentVersion?: string;
  reviewResult?: 'approved' | 'rejected';
}

/** 退役留痕信息（3.5.5：下线时间、原因、替代智能体、归档包引用） */
export interface AgentRetiredInfo {
  retiredAt: string;
  reason: string;
  successorAgentId?: string;
  archiveRef: string;
}

/** 统一智能体元数据记录（字段对齐 3.5.2 全文） */
export interface AgentRecord {
  id: string;
  name: string;
  nameEn: string;
  version: string;
  category: string;
  tags: string[];
  description: string;
  department: string[];
  owner: string;
  approver?: string;
  scenario: string;
  dataScope: DataScope;
  outputType: AgentOutputType;
  riskLevel: AgentRiskLevel;
  reviewRole?: string;
  tools: ToolBinding[];
  knowledgeBases: string[];
  modelBinding: ModelBindingRef;
  promptAssets: PromptAssetBinding;
  entryWorkflow?: string;
  inputSchema?: SchemaRef;
  outputSchema?: SchemaRef;
  interfaces: InterfaceInventory[];
  evaluation: EvaluationReportRef;
  status: AgentStatus;
  deployment: DeploymentPolicy;
  changeLog: AgentChangeEntry[];
  retiredInfo?: AgentRetiredInfo;
  createdAt: string;
  updatedAt: string;
}

/** 智能体查询过滤器 */
export interface AgentRecordFilter {
  status?: AgentStatus;
  riskLevel?: AgentRiskLevel;
  scenario?: string;
  department?: string;
  category?: string;
}

/** 准入门禁所需的复核角色口径（A-02 三级风险与复核角色映射） */
export const EXPERT_REVIEW_ROLE = 'expert-review';
export const PHYSICIAN_CONFIRM_ROLE = 'physician-confirm';

// ============================================================================
// 状态机（3.5.5：draft → review → staging → active → paused → retired；
// active ↔ shadow；retired 终态）
// ============================================================================

/** 合法状态迁移表 */
const STATUS_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  draft: ['review'],
  review: ['staging'],
  staging: ['active'],
  active: ['shadow', 'paused'],
  shadow: ['active'],
  paused: ['retired'],
  retired: [],
};

/** 纯函数：判断智能体状态迁移是否合法 */
export function isValidAgentStatusTransition(from: AgentStatus, to: AgentStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

// ============================================================================
// 纯函数校验
// ============================================================================

const OUTPUT_TYPES: readonly AgentOutputType[] = [
  'question-answer',
  'summary',
  'clinical-note',
  'qc-conclusion',
  'suggestion',
  'report',
];

const RISK_LEVELS: readonly AgentRiskLevel[] = ['low', 'medium', 'high'];
const AGENT_STATUSES: readonly AgentStatus[] = [
  'draft',
  'review',
  'staging',
  'active',
  'shadow',
  'paused',
  'retired',
];
const PATIENT_SCOPES: readonly PatientScope[] = ['own-visit', 'own-department', 'hospital-wide'];
const TOOL_RISKS: readonly ToolRiskLevel[] = ['read-only', 'confirm', 'double-confirm'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** 准入必填字段清单（3.5.3 申请字段 + 3.5.2 元数据），映射视图覆盖度对照使用 */
export const ADMISSION_REQUIRED_FIELDS = [
  'name',
  'department',
  'owner',
  'scenario',
  'dataScope',
  'outputType',
  'riskLevel',
  'modelBinding',
  'knowledgeBases',
  'tools',
  'interfaces',
] as const;

/**
 * 校验智能体记录，返回错误信息数组（空数组 = 通过）。
 * 校验范围：必填非空、枚举合法、dataScope / tools / interfaces 结构、
 * trafficPercent ∈ [0,100]、评测报告结构。
 */
export function validateAgentRecord(record: unknown): string[] {
  const errors: string[] = [];
  if (typeof record !== 'object' || record === null) {
    return ['智能体记录必须为对象'];
  }
  const r = record as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) errors.push('id 必须为非空字符串');
  if (!isNonEmptyString(r.name)) errors.push('name 必须为非空字符串');
  if (r.nameEn !== undefined && typeof r.nameEn !== 'string') errors.push('nameEn 必须为字符串');
  if (!isNonEmptyString(r.version)) errors.push('version 必须为非空语义化版本');
  if (!isNonEmptyString(r.category)) errors.push('category 必须为非空字符串');
  if (!isStringArray(r.tags)) errors.push('tags 必须为字符串数组');
  if (!isNonEmptyString(r.description)) errors.push('description 必须为非空字符串');
  if (!isStringArray(r.department) || r.department.length === 0)
    errors.push('department 必须为非空字符串数组（归属/适用科室）');
  if (!isNonEmptyString(r.owner)) errors.push('owner 必须为非空责任人姓名');
  if (!isNonEmptyString(r.scenario)) errors.push('scenario 必须为非空场景标识');
  if (!OUTPUT_TYPES.includes(r.outputType as AgentOutputType))
    errors.push(`outputType 必须为 ${OUTPUT_TYPES.join(' / ')} 之一`);
  if (!RISK_LEVELS.includes(r.riskLevel as AgentRiskLevel))
    errors.push(`riskLevel 必须为 ${RISK_LEVELS.join(' / ')} 之一`);
  if (r.reviewRole !== undefined && typeof r.reviewRole !== 'string')
    errors.push('reviewRole 必须为字符串');
  if (!isStringArray(r.knowledgeBases)) errors.push('knowledgeBases 必须为字符串数组');

  // dataScope 结构校验
  const scope = r.dataScope;
  if (typeof scope !== 'object' || scope === null) {
    errors.push('dataScope 必须为数据范围对象');
  } else {
    const s = scope as Record<string, unknown>;
    if (!isStringArray(s.systems)) errors.push('dataScope.systems 必须为字符串数组');
    if (!isStringArray(s.tables)) errors.push('dataScope.tables 必须为字符串数组');
    if (!isStringArray(s.fields)) errors.push('dataScope.fields 必须为字符串数组');
    if (!PATIENT_SCOPES.includes(s.patientScope as PatientScope))
      errors.push(`dataScope.patientScope 必须为 ${PATIENT_SCOPES.join(' / ')} 之一`);
    if (typeof s.externalExport !== 'boolean') errors.push('dataScope.externalExport 必须为布尔值');
  }

  // tools 结构校验
  if (!Array.isArray(r.tools)) {
    errors.push('tools 必须为工具绑定数组');
  } else {
    r.tools.forEach((tool, index) => {
      if (typeof tool !== 'object' || tool === null) {
        errors.push(`tools[${index}] 必须为工具绑定对象`);
        return;
      }
      const t = tool as Record<string, unknown>;
      if (!isNonEmptyString(t.toolId)) errors.push(`tools[${index}].toolId 必须为非空字符串`);
      if (!TOOL_RISKS.includes(t.riskLevel as ToolRiskLevel))
        errors.push(`tools[${index}].riskLevel 必须为 ${TOOL_RISKS.join(' / ')} 之一`);
      if (typeof t.quota !== 'object' || t.quota === null) {
        errors.push(`tools[${index}].quota 必须为配额对象`);
      } else {
        const q = t.quota as Record<string, unknown>;
        for (const key of ['callsPerMinute', 'callsPerVisit'] as const) {
          if (q[key] !== undefined && (!Number.isFinite(q[key]) || (q[key] as number) < 0))
            errors.push(`tools[${index}].quota.${key} 必须为非负有限数值`);
        }
      }
    });
  }

  // interfaces 结构校验
  if (!Array.isArray(r.interfaces)) {
    errors.push('interfaces 必须为接口清单数组');
  } else {
    r.interfaces.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        errors.push(`interfaces[${index}] 必须为接口清单对象`);
        return;
      }
      const it = item as Record<string, unknown>;
      if (!isNonEmptyString(it.systemId)) errors.push(`interfaces[${index}].systemId 必须为非空字符串`);
      if (!isNonEmptyString(it.endpoint)) errors.push(`interfaces[${index}].endpoint 必须为非空字符串`);
      if (!isNonEmptyString(it.operation)) errors.push(`interfaces[${index}].operation 必须为非空字符串`);
      if (!isNonEmptyString(it.purpose)) errors.push(`interfaces[${index}].purpose 必须为非空字符串`);
    });
  }

  // modelBinding 结构校验（引用标识，不落明文端点/密钥）
  if (typeof r.modelBinding !== 'object' || r.modelBinding === null) {
    errors.push('modelBinding 必须为模型绑定引用对象');
  } else {
    const mb = r.modelBinding as Record<string, unknown>;
    for (const key of ['cardId', 'routeRuleId', 'fallbackCardId'] as const) {
      if (mb[key] !== undefined && typeof mb[key] !== 'string')
        errors.push(`modelBinding.${key} 必须为字符串引用标识`);
    }
  }

  // deployment 结构与 trafficPercent 区间校验（缺省由 register 补空配置）
  const deployment = r.deployment;
  if (deployment !== undefined) {
    if (typeof deployment !== 'object' || deployment === null) {
      errors.push('deployment 必须为灰度配置对象');
    } else {
      const d = deployment as Record<string, unknown>;
      const dims = d.dimensions;
      if (typeof dims === 'object' && dims !== null) {
        const dim = dims as Record<string, unknown>;
        for (const key of ['departments', 'clinicians', 'documentTypes', 'patientGroups'] as const) {
          if (!isStringArray(dim[key])) errors.push(`deployment.dimensions.${key} 必须为字符串数组`);
        }
        if (!Number.isFinite(dim.trafficPercent) || (dim.trafficPercent as number) < 0 || (dim.trafficPercent as number) > 100)
          errors.push('deployment.dimensions.trafficPercent 必须为 0~100 之间的数值');
      }
      if (typeof d.switches !== 'object' || d.switches === null) errors.push('deployment.switches 必须为开关映射对象');
      if (typeof d.baselineAgentVersion !== 'string') errors.push('deployment.baselineAgentVersion 必须为字符串');
    }
  }

  // status 缺省由 register 补 draft；显式传入时必须为合法枚举
  if (r.status !== undefined && !AGENT_STATUSES.includes(r.status as AgentStatus))
    errors.push(`status 必须为 ${AGENT_STATUSES.join(' / ')} 之一`);

  // 评测报告结构校验（缺省由 register 补空对象）
  const evaluation = r.evaluation;
  if (evaluation !== undefined) {
    if (typeof evaluation !== 'object' || evaluation === null) {
      errors.push('evaluation 必须为评测记录对象');
    } else {
      const ev = evaluation as Record<string, unknown>;
      for (const kind of ['functional', 'quality', 'security'] as const) {
        const report = ev[kind];
        if (report === undefined) continue;
        errors.push(...validateEvaluationReport(report, `evaluation.${kind}`));
      }
    }
  }

  return errors;
}

/** 校验单类评测报告结构 */
function validateEvaluationReport(report: unknown, prefix: string): string[] {
  const errors: string[] = [];
  if (typeof report !== 'object' || report === null) {
    return [`${prefix} 必须为评测报告对象`];
  }
  const e = report as Record<string, unknown>;
  if (!isNonEmptyString(e.evaluationSetVersion)) errors.push(`${prefix}.evaluationSetVersion 必须为非空字符串`);
  if (!Number.isFinite(e.caseCount) || (e.caseCount as number) < 0) errors.push(`${prefix}.caseCount 必须为非负数值`);
  if (!Number.isFinite(e.passedCount) || (e.passedCount as number) < 0) errors.push(`${prefix}.passedCount 必须为非负数值`);
  if (!Number.isFinite(e.failedCount) || (e.failedCount as number) < 0) errors.push(`${prefix}.failedCount 必须为非负数值`);
  if (Number.isFinite(e.caseCount) && Number.isFinite(e.passedCount) && (e.passedCount as number) > (e.caseCount as number))
    errors.push(`${prefix}.passedCount 不得大于 caseCount`);
  if (!isNonEmptyString(e.executor)) errors.push(`${prefix}.executor 必须为非空执行人`);
  if (!isNonEmptyString(e.evaluatedAt)) errors.push(`${prefix}.evaluatedAt 必须为非空评测日期`);
  if (!isNonEmptyString(e.summary)) errors.push(`${prefix}.summary 必须为非空结论摘要`);
  if (typeof e.passed !== 'boolean') errors.push(`${prefix}.passed 必须为布尔值`);
  return errors;
}

// ============================================================================
// 两套注册表映射视图（ADR-01 第一步：统一类型 + 投影视图，不反向写入）
// ============================================================================

/** BFF 岗位条目投影输入（字段口径对齐 `src/bff/agents/agentRegistry.ts`） */
export type AgentRegistryEntryLike = Record<string, unknown>;

/** 声明式智能体包投影输入（字段口径对齐 `AgentDefinition`） */
export type DeclarativeDefinitionLike = Record<string, unknown>;

/** 统一映射视图条目 */
export interface AgentRecordView {
  source: 'bff-role' | 'declarative-package';
  sourceId: string;
  name: string;
  category?: string;
  riskLevel?: string;
  missingRequired: string[];
  fieldCoverage: Record<string, boolean>;
  record?: AgentRecord;
}

/** 统一视图别名（台账 S-06 口径） */
export type UnifiedAgentView = AgentRecordView;

/**
 * BFF 岗位条目映射：按 `roleCode / name / allowedTools` 投影；
 * 岗位注册表未建模部门、责任人、数据范围等准入字段，缺失项进入 missingRequired。
 */
export function mapBffEntry(entry: AgentRegistryEntryLike): AgentRecordView {
  const name = typeof entry.name === 'string' ? entry.name : '';
  const sourceId = typeof entry.roleCode === 'string' ? entry.roleCode : '';
  const toolsPresent = Array.isArray(entry.allowedTools) && entry.allowedTools.length > 0;
  const fieldCoverage: Record<string, boolean> = {
    name: isNonEmptyString(entry.name),
    department: false,
    owner: false,
    scenario: false,
    dataScope: false,
    outputType: false,
    riskLevel: false,
    modelBinding: false,
    knowledgeBases: false,
    tools: toolsPresent,
    interfaces: false,
  };
  return {
    source: 'bff-role',
    sourceId,
    name,
    missingRequired: ADMISSION_REQUIRED_FIELDS.filter((field) => !fieldCoverage[field]),
    fieldCoverage,
  };
}

/**
 * 声明式智能体包映射：按 `id / name / version / category / tags / description /
 * riskLevel / tools / knowledgeBases / systemPrompt / entryWorkflow` 投影；
 * 缺失准入必填项进入 missingRequired。
 */
export function mapDeclarativeDefinition(def: DeclarativeDefinitionLike): AgentRecordView {
  const name = typeof def.name === 'string' ? def.name : '';
  const sourceId = typeof def.id === 'string' ? def.id : '';
  const fieldCoverage: Record<string, boolean> = {
    name: isNonEmptyString(def.name),
    department: false,
    owner: isNonEmptyString(def.author),
    scenario: false,
    dataScope: false,
    outputType: false,
    riskLevel: isNonEmptyString(def.riskLevel),
    modelBinding: typeof def.model === 'object' && def.model !== null,
    knowledgeBases: Array.isArray(def.knowledgeBases) && def.knowledgeBases.length > 0,
    tools: Array.isArray(def.tools) && def.tools.length > 0,
    interfaces: false,
  };
  return {
    source: 'declarative-package',
    sourceId,
    name,
    category: typeof def.category === 'string' ? def.category : undefined,
    riskLevel: typeof def.riskLevel === 'string' ? def.riskLevel : undefined,
    missingRequired: ADMISSION_REQUIRED_FIELDS.filter((field) => !fieldCoverage[field]),
    fieldCoverage,
  };
}

/** 合并两套注册表条目为统一映射视图；仅投影，不反向写入源注册表 */
export function buildMappingView(
  bffEntries: AgentRegistryEntryLike[],
  declarativeDefs: DeclarativeDefinitionLike[],
): UnifiedAgentView[] {
  return [
    ...bffEntries.map((entry) => mapBffEntry(entry)),
    ...declarativeDefs.map((def) => mapDeclarativeDefinition(def)),
  ];
}

// ============================================================================
// 运行指标聚合（3.5.4：智能体 × 版本 × 场景 × 科室 × 时间窗）
// ============================================================================

/** 单次处置 / 异常记录入参 */
export interface RuntimeMetricsInput {
  agentId: string;
  version: string;
  scenario: string;
  department?: string;
  adopted?: boolean;
  modified?: boolean;
  rejected?: boolean;
  modifiedChars?: number;
  abnormalKind?: AbnormalKind;
}

/** 聚合结果 */
export interface AgentRuntimeMetrics {
  agentId: string;
  version: string;
  scenario: string;
  department?: string;
  window: string;
  calls: number;
  adoptionRate: number;
  modificationRate: number;
  rejectionRate: number;
  avgModifiedChars: number;
  abnormalCounts: Record<AbnormalKind, number>;
}

/** 指标查询过滤器 */
export interface RuntimeMetricsFilter {
  agentId?: string;
  version?: string;
  scenario?: string;
  department?: string;
  window?: string;
}

interface MetricsGroup {
  agentId: string;
  version: string;
  scenario: string;
  department?: string;
  calls: number;
  adopted: number;
  modified: number;
  rejected: number;
  modifiedCharsSum: number;
  modifiedCount: number;
  abnormalCounts: Record<AbnormalKind, number>;
}

const ABNORMAL_KINDS: readonly AbnormalKind[] = [
  'timeout',
  'circuit-open',
  'schema-failure',
  'manual-handover',
  'tool-error',
];

function emptyAbnormalCounts(): Record<AbnormalKind, number> {
  return {
    'timeout': 0,
    'circuit-open': 0,
    'schema-failure': 0,
    'manual-handover': 0,
    'tool-error': 0,
  };
}

// ============================================================================
// A16：人工干预点指标类型与内存聚合（对齐 S-05 monitoringEvents 事件字段）
// ============================================================================

/** 人工干预动作（与 S-05 事件负载 `humanAction`、S-08 `AiHumanAction` 口径一致） */
export type InterventionAction = 'adopted' | 'modified' | 'rejected' | 'escalated' | 'pending';

/** 干预动作枚举清单（供三类动作独立计数初始化复用） */
export const INTERVENTION_ACTIONS: readonly InterventionAction[] = [
  'adopted',
  'modified',
  'rejected',
  'escalated',
  'pending',
];

/** 人工干预点指标记录（字段与 S-05 monitoringEvents 负载一一映射） */
export interface HumanInterventionMetric {
  /** 干预动作类型 */
  humanAction: InterventionAction;
  /** 节点位置（对应事件 `humanInterventionPoint` / `nodeId`）；缺失显式记 `unknown` */
  nodeId: string;
  agentId: string;
  agentVersion: string;
  reviewerId?: string;
  comment?: string;
  /** 事件时间戳（epoch 毫秒，入参注入，不依赖系统时钟） */
  at: number;
  scenario?: string;
}

/** 干预指标查询过滤器（AND 组合；时间戳闭区间） */
export interface InterventionFilter {
  agentId?: string;
  agentVersion?: string;
  nodeId?: string;
  action?: InterventionAction;
  scenario?: string;
  from?: number;
  to?: number;
}

/** 干预指标分组聚合结果 */
export interface InterventionAggregate {
  total: number;
  /** 五类动作计数独立可查（未出现动作记 0） */
  byAction: Record<InterventionAction, number>;
  /** 按节点位置分组计数；`unknown` 为缺失位置归组 */
  byNode: Record<string, number>;
  /** 按智能体分组计数 */
  byAgent: Record<string, number>;
}

/** 动作计数零值台账（五类动作独立初始化） */
export function emptyInterventionCounts(): Record<InterventionAction, number> {
  return { adopted: 0, modified: 0, rejected: 0, escalated: 0, pending: 0 };
}

/** 节点位置归一化：空串 / 非字符串显式记 `unknown`，不静默丢弃干预点记录 */
export function normalizeInterventionNodeId(nodeId: unknown): string {
  return typeof nodeId === 'string' && nodeId.trim().length > 0 ? nodeId.trim() : 'unknown';
}

/** 纯函数：追加一条干预指标记录，返回新数组；不修改入参台账 */
export function appendInterventionMetric(
  records: readonly HumanInterventionMetric[],
  metric: HumanInterventionMetric,
): HumanInterventionMetric[] {
  return [...records, structuredClone(metric)];
}

/** 纯函数：按过滤器筛选并分组聚合；无记录时各分组计数记 0；不订阅事件总线、不消费进程外事件流 */
export function aggregateInterventions(
  records: readonly HumanInterventionMetric[],
  filter: InterventionFilter = {},
): InterventionAggregate {
  const byAction = emptyInterventionCounts();
  const byNode: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  let total = 0;

  for (const record of records) {
    if (filter.agentId && record.agentId !== filter.agentId) continue;
    if (filter.agentVersion && record.agentVersion !== filter.agentVersion) continue;
    if (filter.nodeId && record.nodeId !== normalizeInterventionNodeId(filter.nodeId)) continue;
    if (filter.action && record.humanAction !== filter.action) continue;
    if (filter.scenario && record.scenario !== filter.scenario) continue;
    if (typeof filter.from === 'number' && Number.isFinite(filter.from) && record.at < filter.from) continue;
    if (typeof filter.to === 'number' && Number.isFinite(filter.to) && record.at > filter.to) continue;

    total += 1;
    byAction[record.humanAction] += 1;
    byNode[record.nodeId] = (byNode[record.nodeId] ?? 0) + 1;
    byAgent[record.agentId] = (byAgent[record.agentId] ?? 0) + 1;
  }

  return { total, byAction, byNode, byAgent };
}

// ============================================================================
// 准入注册表（进程内存，深拷贝隔离）
// ============================================================================

/**
 * 智能体准入注册表：元数据登记、状态机迁移、三类评测台账、准入门禁、
 * 退役留痕、运行指标聚合。
 */
export class AgentAdmissionRegistry {
  private readonly agents = new Map<string, AgentRecord>();
  private readonly metrics = new Map<string, MetricsGroup>();
  private readonly interventions: HumanInterventionMetric[] = [];

  // --------------------------------------------------------------------------
  // 元数据登记与查询
  // --------------------------------------------------------------------------

  /**
   * 登记智能体记录：字段完整性与枚举校验；重复 id 拒绝；
   * 缺省补 deployment 空配置、changeLog=[]、evaluation={}、status='draft'；返回深拷贝。
   */
  register(record: AgentRecord): AgentRecord {
    const errors = validateAgentRecord(record);
    if (errors.length > 0) {
      throw new Error(`[ADM-001] 智能体记录校验未通过：${errors.join('；')}`);
    }
    if (this.agents.has(record.id)) {
      throw new Error(`[ADM-002] 智能体 ID「${record.id}」已存在，禁止重复登记`);
    }
    const nowIso = new Date().toISOString();
    const stored: AgentRecord = {
      ...structuredClone(record),
      deployment: record.deployment ?? {
        dimensions: { departments: [], clinicians: [], documentTypes: [], patientGroups: [], trafficPercent: 0 },
        switches: {},
        baselineAgentVersion: '',
      },
      evaluation: record.evaluation ?? {},
      changeLog: record.changeLog ?? [],
      status: record.status ?? 'draft',
      createdAt: record.createdAt || nowIso,
      updatedAt: record.updatedAt || nowIso,
    };
    this.agents.set(stored.id, stored);
    return structuredClone(stored);
  }

  /** 返回深拷贝；未登记返回 undefined */
  getAgent(id: string): AgentRecord | undefined {
    const record = this.agents.get(id);
    return record ? structuredClone(record) : undefined;
  }

  /** 返回深拷贝；未登记抛中文错误 */
  getAgentOrThrow(id: string): AgentRecord {
    const record = this.agents.get(id);
    if (!record) throw new Error(`[ADM-003] 智能体「${id}」未登记，无法执行该操作`);
    return structuredClone(record);
  }

  /** 按状态 / 风险等级 / 场景 / 科室 / 分类过滤；返回深拷贝数组，不可反向修改台账 */
  listAgents(filter?: AgentRecordFilter): AgentRecord[] {
    let result = [...this.agents.values()];
    if (filter?.status) result = result.filter((agent) => agent.status === filter.status);
    if (filter?.riskLevel) result = result.filter((agent) => agent.riskLevel === filter.riskLevel);
    if (filter?.scenario) result = result.filter((agent) => agent.scenario === filter.scenario);
    if (filter?.category) result = result.filter((agent) => agent.category === filter.category);
    if (filter?.department)
      result = result.filter((agent) => agent.department.includes(filter.department!));
    return result.map((agent) => structuredClone(agent));
  }

  // --------------------------------------------------------------------------
  // 准入流程与准入门禁
  // --------------------------------------------------------------------------

  /** 提交评审：draft → review，追加变更记录；非法迁移抛中文错误 */
  submitForReview(
    id: string,
    entry: { operator: string; summary: string; parentVersion?: string; reviewResult?: 'approved' | 'rejected' },
  ): void {
    const record = this.require(id);
    this.guardTransition(record.status, 'review', id);
    record.status = 'review';
    this.appendChange(record, {
      version: record.version,
      changedAt: new Date().toISOString(),
      operator: entry.operator,
      summary: entry.summary,
      parentVersion: entry.parentVersion,
      reviewResult: entry.reviewResult,
    });
  }

  /** 审批通过技术合规审查：review → staging，写入审批人 */
  approve(id: string, approver: string): void {
    const record = this.require(id);
    this.guardTransition(record.status, 'staging', id);
    record.status = 'staging';
    record.approver = approver;
    this.appendChange(record, {
      version: record.version,
      changedAt: new Date().toISOString(),
      operator: approver,
      summary: '技术合规审查通过，进入 staging 待评测',
      reviewResult: 'approved',
    });
  }

  /**
   * 发布激活：staging → active。先执行准入门禁（3.5.3），任一不满足抛中文错误，
   * 状态保持不变；门禁包含三类评测齐全且通过、功能评测通过率 ≥95%、
   * 风险等级与复核角色匹配。
   */
  activate(id: string): void {
    const record = this.require(id);
    this.guardTransition(record.status, 'active', id);
    const gateErrors = this.checkAdmissionGate(record);
    if (gateErrors.length > 0) {
      throw new Error(`[ADM-005] 智能体「${id}」未通过准入门禁，禁止发布 active：${gateErrors.join('；')}`);
    }
    record.status = 'active';
    this.appendChange(record, {
      version: record.version,
      changedAt: new Date().toISOString(),
      operator: record.approver ?? record.owner,
      summary: '准入门禁通过，发布 active',
      reviewResult: 'approved',
    });
  }

  /** 准入门禁检查，返回不满足项中文错误清单（空数组 = 通过） */
  private checkAdmissionGate(record: AgentRecord): string[] {
    const errors: string[] = [];
    const evaluation = record.evaluation;

    if (!evaluation.functional) {
      errors.push('功能评测记录缺失');
    } else {
      if (!evaluation.functional.passed) errors.push('功能评测未通过');
      if (evaluation.functional.caseCount > 0) {
        const rate = evaluation.functional.passedCount / evaluation.functional.caseCount;
        if (rate < 0.95) {
          errors.push(`功能评测通过率 ${(rate * 100).toFixed(1)}% 低于 95% 门槛`);
        }
      }
    }
    if (!evaluation.quality) {
      errors.push('质量评测记录缺失');
    } else if (!evaluation.quality.passed) {
      errors.push('质量评测未通过（质量分未达基线或存在无依据结论）');
    }
    if (!evaluation.security) {
      errors.push('安全对抗评测记录缺失');
    } else if (!evaluation.security.passed) {
      errors.push('安全对抗评测未通过，存在未被拦截/降级的对抗用例');
    }

    if (record.riskLevel === 'high' && record.reviewRole !== EXPERT_REVIEW_ROLE) {
      errors.push('高风险智能体必须配置专家复核角色（expert-review）');
    }
    if (record.riskLevel === 'medium' && record.reviewRole !== PHYSICIAN_CONFIRM_ROLE) {
      errors.push('中风险智能体必须配置医师确认角色（physician-confirm）');
    }
    return errors;
  }

  // --------------------------------------------------------------------------
  // 评测台账
  // --------------------------------------------------------------------------

  /** 登记三类评测之一；评测集版本与智能体版本绑定归档；未登记 id 抛错 */
  recordEvaluation(id: string, kind: EvaluationKind, report: EvaluationReport): void {
    const record = this.require(id);
    const errors = validateEvaluationReport(report, `evaluation.${kind}`);
    if (errors.length > 0) throw new Error(`[ADM-006] 评测报告校验未通过：${errors.join('；')}`);
    record.evaluation[kind] = structuredClone(report);
    record.updatedAt = new Date().toISOString();
  }

  /** 回读三类评测记录深拷贝；未登记 id 抛错 */
  getEvaluation(id: string): EvaluationReportRef {
    const record = this.require(id);
    return structuredClone(record.evaluation);
  }

  // --------------------------------------------------------------------------
  // 暂停 / 退役 / 调用态
  // --------------------------------------------------------------------------

  /** 暂停接入新任务：active → paused，可留变更原因 */
  pause(id: string, reason?: string): void {
    const record = this.require(id);
    this.guardTransition(record.status, 'paused', id);
    record.status = 'paused';
    this.appendChange(record, {
      version: record.version,
      changedAt: new Date().toISOString(),
      operator: record.owner,
      summary: reason ?? '智能体暂停接入新任务',
    });
  }

  /** 退役：paused → retired，写入 retiredInfo 与退役变更记录；retired 为终态 */
  retire(id: string, info: { reason: string; successorAgentId?: string; archiveRef: string }): void {
    const record = this.require(id);
    this.guardTransition(record.status, 'retired', id);
    const nowIso = new Date().toISOString();
    record.status = 'retired';
    record.retiredInfo = {
      retiredAt: nowIso,
      reason: info.reason,
      successorAgentId: info.successorAgentId,
      archiveRef: info.archiveRef,
    };
    this.appendChange(record, {
      version: record.version,
      changedAt: nowIso,
      operator: record.owner,
      summary: `智能体退役归档：${info.reason}`,
      parentVersion: record.version,
      reviewResult: 'approved',
    });
  }

  /** 是否可被新任务调用：仅 active / shadow 为 true；paused / retired 等不可调用 */
  isCallable(id: string): boolean {
    const record = this.agents.get(id);
    if (!record) return false;
    return record.status === 'active' || record.status === 'shadow';
  }

  // --------------------------------------------------------------------------
  // 变更台账
  // --------------------------------------------------------------------------

  /** 追加变更记录；未登记 id 抛错 */
  recordChange(id: string, entry: AgentChangeEntry): void {
    const record = this.require(id);
    record.changeLog.push(structuredClone(entry));
    record.updatedAt = new Date().toISOString();
  }

  /** 按登记先后返回变更记录深拷贝；未登记 id 抛错 */
  getChangeLog(id: string): AgentChangeEntry[] {
    const record = this.require(id);
    return record.changeLog.map((entry) => structuredClone(entry));
  }

  // --------------------------------------------------------------------------
  // 运行指标
  // --------------------------------------------------------------------------

  /** 记录一次处置 / 异常事件，按 智能体 × 版本 × 场景 × 科室 分组累计 */
  recordRuntimeMetrics(input: RuntimeMetricsInput): void {
    if (!isNonEmptyString(input.agentId)) throw new Error('[ADM-007] 运行指标缺少 agentId');
    if (!isNonEmptyString(input.version)) throw new Error('[ADM-007] 运行指标缺少 version');
    if (!isNonEmptyString(input.scenario)) throw new Error('[ADM-007] 运行指标缺少 scenario');
    if (input.modifiedChars !== undefined && (!Number.isFinite(input.modifiedChars) || input.modifiedChars < 0))
      throw new Error('[ADM-007] modifiedChars 必须为非负数值');
    const key = this.metricsKey(input.agentId, input.version, input.scenario, input.department);
    let group = this.metrics.get(key);
    if (!group) {
      group = {
        agentId: input.agentId,
        version: input.version,
        scenario: input.scenario,
        department: input.department,
        calls: 0,
        adopted: 0,
        modified: 0,
        rejected: 0,
        modifiedCharsSum: 0,
        modifiedCount: 0,
        abnormalCounts: emptyAbnormalCounts(),
      };
      this.metrics.set(key, group);
    }
    group.calls += 1;
    if (input.adopted) group.adopted += 1;
    if (input.modified) {
      group.modified += 1;
      group.modifiedCount += 1;
      group.modifiedCharsSum += input.modifiedChars ?? 0;
    }
    if (input.rejected) group.rejected += 1;
    if (input.abnormalKind) group.abnormalCounts[input.abnormalKind] += 1;
  }

  /** 查询并聚合运行指标；分母为 0 时比率记 0 */
  queryRuntimeMetrics(filter: RuntimeMetricsFilter = {}): AgentRuntimeMetrics[] {
    let groups = [...this.metrics.values()];
    if (filter.agentId) groups = groups.filter((g) => g.agentId === filter.agentId);
    if (filter.version) groups = groups.filter((g) => g.version === filter.version);
    if (filter.scenario) groups = groups.filter((g) => g.scenario === filter.scenario);
    if (filter.department) groups = groups.filter((g) => g.department === filter.department);
    return groups.map((group) => {
      const calls = group.calls;
      const adoptionRate = calls > 0 ? group.adopted / calls : 0;
      const modificationRate = calls > 0 ? group.modified / calls : 0;
      const rejectionRate = calls > 0 ? group.rejected / calls : 0;
      const avgModifiedChars = group.modifiedCount > 0 ? group.modifiedCharsSum / group.modifiedCount : 0;
      return {
        agentId: group.agentId,
        version: group.version,
        scenario: group.scenario,
        department: group.department,
        window: filter.window ?? 'all',
        calls,
        adoptionRate,
        modificationRate,
        rejectionRate,
        avgModifiedChars,
        abnormalCounts: structuredClone(group.abnormalCounts),
      };
    });
  }

  // --------------------------------------------------------------------------
  // 人工干预点指标（A16；进程内存，不订阅事件总线）
  // --------------------------------------------------------------------------

  /**
   * 记录一条人工干预点指标；agentId / agentVersion / 动作 / 时间戳必填；
   * 节点位置缺失归一为 `unknown`；动作枚举非法抛中文错误。
   */
  recordInterventionMetric(input: {
    humanAction: InterventionAction;
    nodeId?: string;
    agentId: string;
    agentVersion: string;
    reviewerId?: string;
    comment?: string;
    at: number;
    scenario?: string;
  }): void {
    if (!isNonEmptyString(input.agentId)) throw new Error('[ADM-008] 干预指标缺少 agentId');
    if (!isNonEmptyString(input.agentVersion)) throw new Error('[ADM-008] 干预指标缺少 agentVersion');
    if (!INTERVENTION_ACTIONS.includes(input.humanAction))
      throw new Error(`[ADM-008] humanAction 必须为 ${INTERVENTION_ACTIONS.join(' / ')} 之一`);
    if (!Number.isFinite(input.at)) throw new Error('[ADM-008] 干预指标时间戳必须为有限数值');
    const metric: HumanInterventionMetric = {
      humanAction: input.humanAction,
      nodeId: normalizeInterventionNodeId(input.nodeId),
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      reviewerId: input.reviewerId,
      comment: input.comment,
      at: input.at,
      scenario: input.scenario,
    };
    this.interventions.push(metric);
  }

  /** 按过滤器回读干预指标深拷贝；不过滤时返回全部记录深拷贝 */
  queryInterventionMetrics(filter: InterventionFilter = {}): HumanInterventionMetric[] {
    return this.interventions
      .filter((record) => {
        if (filter.agentId && record.agentId !== filter.agentId) return false;
        if (filter.agentVersion && record.agentVersion !== filter.agentVersion) return false;
        if (filter.nodeId && record.nodeId !== normalizeInterventionNodeId(filter.nodeId)) return false;
        if (filter.action && record.humanAction !== filter.action) return false;
        if (filter.scenario && record.scenario !== filter.scenario) return false;
        if (typeof filter.from === 'number' && Number.isFinite(filter.from) && record.at < filter.from) return false;
        if (typeof filter.to === 'number' && Number.isFinite(filter.to) && record.at > filter.to) return false;
        return true;
      })
      .map((record) => structuredClone(record));
  }

  /** 按过滤器聚合干预指标：动作 / 节点 / 智能体三维分组计数，动作计数独立可查 */
  aggregateInterventionMetrics(filter: InterventionFilter = {}): InterventionAggregate {
    return aggregateInterventions(this.interventions, filter);
  }

  // --------------------------------------------------------------------------
  // 内部辅助
  // --------------------------------------------------------------------------

  private require(id: string): AgentRecord {
    const record = this.agents.get(id);
    if (!record) throw new Error(`[ADM-003] 智能体「${id}」未登记，无法执行该操作`);
    return record;
  }

  private guardTransition(from: AgentStatus, to: AgentStatus, id: string): void {
    if (!isValidAgentStatusTransition(from, to)) {
      const allowed = STATUS_TRANSITIONS[from];
      const hint = allowed.length > 0 ? `合法迁移：${from} → ${allowed.join(' / ')}` : `${from} 为终态，禁止再迁移`;
      throw new Error(`[ADM-004] 非法状态迁移：${from} → ${to}（智能体「${id}」）；${hint}`);
    }
  }

  private appendChange(record: AgentRecord, entry: AgentChangeEntry): void {
    record.changeLog.push(structuredClone(entry));
    record.updatedAt = new Date().toISOString();
  }

  private metricsKey(agentId: string, version: string, scenario: string, department?: string): string {
    return `${agentId}::${version}::${scenario}::${department ?? ''}`;
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _registry: AgentAdmissionRegistry | null = null;

/** 获取进程级准入注册表单例（后续接统一仓储时替换实现） */
export function getAgentAdmissionRegistry(): AgentAdmissionRegistry {
  if (!_registry) _registry = new AgentAdmissionRegistry();
  return _registry;
}

/** 测试专用：重置模块级准入注册表单例 */
export function _resetAgentAdmissionRegistry(): void {
  _registry = null;
}

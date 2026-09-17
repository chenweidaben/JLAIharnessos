/**
 * 健澜科技杠OS - 智能体编排层 DSL 类型定义
 *
 * 本文件定义智能体（Agent）与工作流（Workflow）的声明式领域特定语言（DSL）类型。
 * DSL 采用 YAML/JSON 描述，可被低代码画布可视化编辑，并由工作流引擎解析执行。
 *
 * 设计原则：
 * 1. 声明式：只描述"做什么、数据如何流转"，不描述具体执行细节；
 * 2. 可序列化：所有结构均为纯数据（JSON 可表达），支持版本化、导入导出；
 * 3. 可校验：结构与 dsl/schema.ts 中的 Zod 运行时校验一一对应；
 * 4. 安全默认：高风险节点必须显式声明风险等级与确认策略（fail-closed）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 基础类型
// ============================================================================

/** 语义化版本号（SemVer），如 1.0.3 */
export type SemVer = string;

/** 节点类型枚举（工作流画布中的 12 类节点） */
export enum WorkflowNodeType {
  /** 开始节点：工作流唯一入口，接收外部输入 */
  START = 'start',
  /** 结束节点：产出工作流最终结果 */
  END = 'end',
  /** 大模型节点：调用 LLM 进行理解、生成、推理 */
  LLM = 'llm',
  /** 工具节点：调用注册的医疗工具（36 个内置工具之一或自定义工具） */
  TOOL = 'tool',
  /** 条件节点：if-else / switch 分支路由 */
  CONDITION = 'condition',
  /** 循环节点：while（条件循环）/ foreach（遍历集合） */
  LOOP = 'loop',
  /** 并行节点：all（全部完成）/ any（任一完成）/ race（最快完成） */
  PARALLEL = 'parallel',
  /** 人工节点：挂起工作流，等待人工审核或补充信息后恢复 */
  HUMAN = 'human',
  /** 子智能体节点：调用另一个智能体（可嵌套编排，支持 MDT 会诊） */
  SUBAGENT = 'subagent',
  /** 知识检索节点：RAG 混合检索医学知识库 */
  RAG = 'rag',
  /** 数据映射节点：在白名单内做安全的数据转换与表达式计算（禁止任意代码执行） */
  CODE = 'code',
  /** 延时节点：等待指定时长，常用于定时/节流场景 */
  DELAY = 'delay',
}

/** 工作流运行状态机 */
export enum WorkflowState {
  /** 草稿：尚未通过校验 */
  DRAFT = 'draft',
  /** 已校验：结构合法，可被执行 */
  VALIDATED = 'validated',
  /** 运行中 */
  RUNNING = 'running',
  /** 等待人工：命中 human 节点被挂起 */
  WAITING_HUMAN = 'waiting_human',
  /** 已暂停：外部主动暂停，可恢复 */
  PAUSED = 'paused',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败：节点错误且重试耗尽 */
  FAILED = 'failed',
  /** 已取消 */
  CANCELLED = 'cancelled',
}

/** 节点运行状态 */
export enum NodeState {
  PENDING = 'pending',
  RUNNING = 'running',
  WAITING_HUMAN = 'waiting_human',
  SKIPPED = 'skipped',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/** 风险等级（与医疗工具风险等级对齐） */
export type AgentRiskLevel = 'low' | 'medium' | 'high';

/** 并行节点的汇聚策略 */
export type ParallelMode = 'all' | 'any' | 'race';

/** 循环节点模式 */
export type LoopMode = 'while' | 'foreach';

// ============================================================================
// 重试 / 超时 / 错误处理策略
// ============================================================================

/** 节点级重试策略 */
export interface RetryPolicy {
  /** 最大重试次数（0 表示不重试） */
  maxAttempts: number;
  /** 首次重试间隔（毫秒），后续按指数退避 */
  initialDelayMs: number;
  /** 退避倍率，如 2 表示每次间隔翻倍 */
  backoffMultiplier: number;
  /** 最大间隔（毫秒），避免退避无限增长 */
  maxDelayMs: number;
  /** 触发重试的错误码白名单（为空则仅对网络/超时类临时错误重试） */
  retryableErrorCodes?: string[];
}

/** 节点错误处理策略 */
export interface ErrorHandling {
  /** 重试策略 */
  retry?: RetryPolicy;
  /** 失败后的出口节点（用于降级/补偿流程）；不配置则工作流失败 */
  fallbackNode?: string;
  /** 是否为可补偿节点，失败/取消时执行 compensationNode */
  compensationNode?: string;
  /** 是否允许部分失败（主要用于 parallel 节点） */
  continueOnError?: boolean;
}

// ============================================================================
// 节点配置（按节点类型区分）
// ============================================================================

/** LLM 节点配置 */
export interface LlmNodeConfig {
  /** 模型标识，如 claude-sonnet、gpt-4o、qwen-max 等 */
  model: string;
  /** 温度（0-2），医疗场景默认 0.2 */
  temperature?: number;
  /** top-p 采样 */
  topP?: number;
  /** 单次最大输出 token */
  maxTokens?: number;
  /** 是否流式输出 */
  stream?: boolean;
  /** 系统提示词（内联文本或 prompts/ 文件名引用，形如 "prompts/system.md"） */
  systemPrompt?: string;
  /** 用户消息模板，支持 ${...} 变量引用 */
  userTemplate: string;
  /** few-shot 示例引用 */
  fewShotRefs?: string[];
  /** 是否要求模型输出结构化 JSON，并按 outputSchema 校验 */
  jsonMode?: boolean;
  /** 绑定的知识库名称（作为检索增强上下文，由引擎自动前置 rag） */
  knowledgeBase?: string;
}

/** 工具节点配置 */
export interface ToolNodeConfig {
  /** 医疗工具名称（须在工具注册表中存在，如 query_patient） */
  toolName: string;
  /** 入参映射：值为表达式，引用工作流变量 */
  inputMapping: Record<string, string>;
  /** 风险等级（缺省取工具自身风险等级） */
  riskLevel?: AgentRiskLevel;
  /** 是否需要人工确认（高风险工具默认 true，由风险管理器强制） */
  requireConfirmation?: boolean;
  /** 是否需要双人复核（如麻醉/剧毒药品医嘱） */
  requireDoubleConfirm?: boolean;
  /** 只读标记：只读工具可安全并发与重试 */
  readOnly?: boolean;
}

/** 条件分支配置 */
export interface ConditionBranch {
  /** 分支名称（用于边端口标识） */
  name: string;
  /** 安全表达式，求值为布尔；switch 模式下为值匹配表达式 */
  when: string;
}

/** 条件节点配置 */
export interface ConditionNodeConfig {
  /** if-else：按 branches 顺序匹配，均不命中走 default；switch：对 switchOn 求值后与 cases 比较 */
  mode: 'if-else' | 'switch';
  /** switch 模式下要求值的表达式 */
  switchOn?: string;
  /** if-else 分支 */
  branches?: ConditionBranch[];
  /** switch 分支：case 值 -> 出口名 */
  cases?: Record<string, string>;
  /** 默认出口节点（else / default） */
  defaultPort: string;
}

/** 循环节点配置 */
export interface LoopNodeConfig {
  mode: LoopMode;
  /** while：继续循环的条件表达式 */
  whileCondition?: string;
  /** foreach：要遍历的集合表达式 */
  collection?: string;
  /** 当前元素变量名（foreach） */
  itemVariable?: string;
  /** 当前索引变量名（foreach） */
  indexVariable?: string;
  /** 循环体入口节点 */
  bodyEntry: string;
  /** 最大迭代次数（硬性保护，防止死循环） */
  maxIterations: number;
}

/** 并行分支配置 */
export interface ParallelBranch {
  /** 分支名称 */
  name: string;
  /** 该分支入口节点 */
  entryNode: string;
}

/** 并行节点配置 */
export interface ParallelNodeConfig {
  mode: ParallelMode;
  /** 最大并发度 */
  concurrency: number;
  /** 各并行分支 */
  branches: ParallelBranch[];
  /** any 模式下需要成功的分支数 */
  requiredSuccessCount?: number;
  /** 整体超时（毫秒） */
  timeoutMs?: number;
}

/** 人工节点配置 */
export interface HumanNodeConfig {
  /** 人工任务标题 */
  title: string;
  /** 任务说明（展示给审核人） */
  instructions: string;
  /** 允许处理的角色 */
  assigneeRoles: string[];
  /** 指定处理人 ID（可选，优先级高于角色） */
  assigneeUserIds?: string[];
  /** 需要人工填写的表单字段（JSON Schema 片段） */
  formSchema?: Record<string, unknown>;
  /** 超时（毫秒），超时走超时出口或升级 */
  timeoutMs?: number;
  /** 超时升级给的角色 */
  escalateToRoles?: string[];
}

/** 子智能体节点配置 */
export interface SubagentNodeConfig {
  /** 目标智能体 ID */
  agentId: string;
  /** 目标智能体版本（缺省最新已发布版） */
  version?: SemVer;
  /** 传递给子智能体的输入映射 */
  inputMapping: Record<string, string>;
  /** 协作模式：委派（一次性返回）/ 会诊（多专家并行后汇总） */
  mode: 'delegate' | 'consultation';
  /** consultation 模式下参与会诊的智能体列表 */
  consultationAgents?: string[];
  /** 超时（毫秒） */
  timeoutMs?: number;
}

/** RAG 知识检索节点配置 */
export interface RagNodeConfig {
  /** 知识库名称或名称列表 */
  knowledgeBases: string[];
  /** 查询表达式（通常引用上游问题/主诉） */
  query: string;
  /** 召回条数 topK */
  topK: number;
  /** 相似度阈值（0-1），低于阈值的片段被过滤 */
  scoreThreshold: number;
  /** 检索策略：vector / keyword / hybrid */
  strategy: 'vector' | 'keyword' | 'hybrid';
  /** 是否仅检索权威来源（指南/药典/标准） */
  authoritativeOnly?: boolean;
  /** 检索结果输出变量名，供后续 LLM 节点引用 */
  outputVariable: string;
}

/** 数据映射节点配置（安全表达式） */
export interface CodeNodeConfig {
  /** 输出字段 -> 安全表达式 的映射 */
  assignments: Record<string, string>;
}

/** 延时节点配置 */
export interface DelayNodeConfig {
  /** 延时毫秒 */
  durationMs: number;
}

/** 节点配置联合类型（按 type 索引） */
export interface NodeConfigMap {
  [WorkflowNodeType.START]: Record<string, never>;
  [WorkflowNodeType.END]: {
    /** 最终输出映射：输出字段 -> 表达式 */
    outputMapping: Record<string, string>;
  };
  [WorkflowNodeType.LLM]: LlmNodeConfig;
  [WorkflowNodeType.TOOL]: ToolNodeConfig;
  [WorkflowNodeType.CONDITION]: ConditionNodeConfig;
  [WorkflowNodeType.LOOP]: LoopNodeConfig;
  [WorkflowNodeType.PARALLEL]: ParallelNodeConfig;
  [WorkflowNodeType.HUMAN]: HumanNodeConfig;
  [WorkflowNodeType.SUBAGENT]: SubagentNodeConfig;
  [WorkflowNodeType.RAG]: RagNodeConfig;
  [WorkflowNodeType.CODE]: CodeNodeConfig;
  [WorkflowNodeType.DELAY]: DelayNodeConfig;
}

// ============================================================================
// 节点与边
// ============================================================================

/**
 * 工作流节点定义
 */
export interface NodeDefinition {
  /** 节点 ID（工作流内唯一，小写字母数字下划线） */
  id: string;
  /** 节点类型 */
  type: WorkflowNodeType;
  /** 画布展示名称 */
  name: string;
  /** 画布坐标（低代码画布使用，引擎不关心） */
  position?: { x: number; y: number };
  /** 类型相关配置 */
  config: NodeConfigMap[WorkflowNodeType];
  /** 节点级错误处理 */
  errorHandling?: ErrorHandling;
  /** 节点超时（毫秒） */
  timeoutMs?: number;
  /** 是否启用（禁用节点在校验时报孤立/不可达提示） */
  enabled?: boolean;
  /** 备注 */
  description?: string;
}

/**
 * 工作流边（数据/控制流连接）
 */
export interface EdgeDefinition {
  /** 边 ID */
  id: string;
  /** 源节点 ID */
  source: string;
  /** 源端口：条件节点为分支名，其余为 'out' */
  sourcePort?: string;
  /** 目标节点 ID */
  target: string;
  /** 边上的数据映射（可选，进入目标节点前写入变量） */
  dataMapping?: Record<string, string>;
}

// ============================================================================
// 工作流定义
// ============================================================================

/** 工作流元信息 */
export interface WorkflowMeta {
  /** 工作流 ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 版本号 */
  version: SemVer;
  /** 作者 */
  author?: string;
  /** 描述 */
  description?: string;
  /** 标签 */
  tags?: string[];
  /** 创建/更新时间（ISO） */
  createdAt?: string;
  updatedAt?: string;
}

/** 工作流定义 */
export interface WorkflowDefinition {
  /** 元信息 */
  meta: WorkflowMeta;
  /** 节点列表 */
  nodes: NodeDefinition[];
  /** 边列表 */
  edges: EdgeDefinition[];
  /** 工作流级输入定义（JSON Schema） */
  inputSchema?: Record<string, unknown>;
  /** 工作流级输出定义（JSON Schema） */
  outputSchema?: Record<string, unknown>;
  /** 工作流级变量默认值 */
  variables?: Record<string, unknown>;
  /** 全局默认超时（毫秒） */
  timeoutMs?: number;
}

// ============================================================================
// 智能体定义
// ============================================================================

/** 模型参数 */
export interface ModelConfig {
  provider: string;
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /** 响应格式 */
  responseFormat?: 'text' | 'json';
}

/** 智能体定义（agent.yaml 的结构） */
export interface AgentDefinition {
  /** 智能体唯一 ID（小写中划线，如 medical-record-writer） */
  id: string;
  /** 中文名 */
  name: string;
  /** 英文名 */
  nameEn?: string;
  /** 版本 */
  version: SemVer;
  /** 分类（如 病历/诊断/用药/质控/运营） */
  category: string;
  /** 标签 */
  tags: string[];
  /** 一句话描述 */
  description: string;
  /** 详细说明 */
  detailedDescription?: string;
  /** 适用角色 */
  allowedRoles: string[];
  /** 风险等级 */
  riskLevel: AgentRiskLevel;
  /** 作者/维护团队 */
  author?: string;
  /** 开源/内置标识 */
  builtin?: boolean;
  /** 绑定的医疗工具名称列表（须在工具注册表存在） */
  tools: string[];
  /** 绑定的知识库名称列表 */
  knowledgeBases?: string[];
  /** 模型配置 */
  model: ModelConfig;
  /** 系统提示词（内联或文件引用） */
  systemPrompt: string;
  /** 提示词片段/模板引用 */
  promptRefs?: string[];
  /** 入口工作流 ID（在 workflows 中） */
  entryWorkflow: string;
  /** 打包内的工作流定义 */
  workflows: WorkflowDefinition[];
  /** 输入 JSON Schema */
  inputSchema?: Record<string, unknown>;
  /** 输出 JSON Schema */
  outputSchema?: Record<string, unknown>;
  /** 触发方式 */
  triggers?: TriggerDeclaration[];
  /** 图标标识 */
  icon?: string;
  /** 免责声明（医疗 AI 必须：辅助性质，需医生审核） */
  disclaimer: string;
  /** 是否启用 */
  enabled?: boolean;
}

/** 触发器声明 */
export interface TriggerDeclaration {
  /** 触发类型 */
  type: 'manual' | 'api' | 'event' | 'schedule';
  /** event：事件名（如 critical_value.emitted）；schedule：cron 表达式 */
  expression?: string;
  /** 描述 */
  description?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 智能体包（导入导出/市场分发的最小单元）
 * 包含智能体定义、其工作流、提示词资源（不含任何敏感数据与密钥）
 */
export interface AgentPackage {
  /** 包格式版本 */
  packageFormatVersion: SemVer;
  /** 智能体定义 */
  agent: AgentDefinition;
  /** 提示词资源：路径 -> 文本 */
  prompts: Record<string, string>;
  /** 依赖的知识库元数据（名称、版本、来源），不含知识数据本体 */
  knowledgeRefs?: KnowledgeRef[];
  /** 打包时间 */
  packagedAt?: string;
  /** 校验和（由打包工具计算） */
  checksum?: string;
}

/** 知识库引用 */
export interface KnowledgeRef {
  name: string;
  version?: SemVer;
  source: string;
  /** 许可证（如 CC-BY-4.0、Apache-2.0、internal） */
  license: string;
}

// ============================================================================
// 加载与校验结果
// ============================================================================

/** DSL 校验问题严重级别 */
export type IssueSeverity = 'error' | 'warning';

/** DSL 校验问题 */
export interface ValidationIssue {
  severity: IssueSeverity;
  /** 问题码，如 NODE_DANGLING_EDGE */
  code: string;
  /** 人类可读说明 */
  message: string;
  /** 关联节点/边 ID */
  nodeId?: string;
  edgeId?: string;
  /** 修复建议 */
  suggestion?: string;
}

/** 校验结果 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** DSL 加载错误码 */
export const DslIssueCode = {
  SCHEMA_INVALID: 'SCHEMA_INVALID',
  DUPLICATE_NODE_ID: 'DUPLICATE_NODE_ID',
  NO_ENTRY: 'NO_ENTRY',
  MULTIPLE_ENTRY: 'MULTIPLE_ENTRY',
  NO_TERMINAL: 'NO_TERMINAL',
  DANGLING_EDGE: 'DANGLING_EDGE',
  CYCLE_DETECTED: 'CYCLE_DETECTED',
  UNREACHABLE_NODE: 'UNREACHABLE_NODE',
  MISSING_PORT: 'MISSING_PORT',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  KNOWLEDGE_NOT_FOUND: 'KNOWLEDGE_NOT_FOUND',
  SUBAGENT_NOT_FOUND: 'SUBAGENT_NOT_FOUND',
  LOOP_NO_BODY: 'LOOP_NO_BODY',
  PARALLEL_NO_BRANCH: 'PARALLEL_NO_BRANCH',
  WORKFLOW_NOT_FOUND: 'WORKFLOW_NOT_FOUND',
  VERSION_INCOMPATIBLE: 'VERSION_INCOMPATIBLE',
} as const;

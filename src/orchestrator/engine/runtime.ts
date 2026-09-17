/**
 * 健澜科技杠OS - 编排层运行时服务接口（SPI）
 *
 * 工作流引擎本身不绑定具体的 LLM 厂商、知识库实现或医疗工具调用方式，
 * 而是通过本文件定义的一组服务提供者接口（Service Provider Interface）解耦。
 * 宿主在启动引擎时注入具体实现：
 *   - LLM 适配：对接 core/agent/LLMClient（多模型、流式）；
 *   - RAG 适配：对接 knowledge / knowledge-platform 检索引擎；
 *   - 工具适配：对接 medical-tools 注册表的 36 个工具与安全执行链；
 *   - 人工任务：对接 BFF/前端的审核工单中心；
 *   - 子智能体：对接 AgentInvoker（支持嵌套编排与 MDT 会诊）。
 *
 * 测试时注入 Mock 实现即可端到端验证工作流，无需真实模型与外部系统。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { ToolResult } from '../../medical-tools/types.js';

// ============================================================================
// LLM 服务
// ============================================================================

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  /** 要求输出 JSON 并进行结构校验 */
  jsonMode?: boolean;
  /** 关联追踪 ID */
  traceId?: string;
}

export interface LlmResponse {
  /** 文本输出 */
  text: string;
  /** jsonMode 时解析出的结构化对象 */
  json?: unknown;
  /** token 用量 */
  tokens: { input: number; output: number };
  /** 结束原因 */
  finishReason?: 'stop' | 'length' | 'tool_use' | 'error';
}

/** LLM 服务接口 */
export interface IWorkflowLlm {
  complete(req: LlmRequest): Promise<LlmResponse>;
}

// ============================================================================
// RAG 知识检索服务
// ============================================================================

export interface RagChunk {
  id: string;
  /** 片段正文 */
  content: string;
  /** 相关度得分（0-1） */
  score: number;
  /** 来源文档名 */
  source: string;
  /** 标题 */
  title?: string;
  /** 权威级别（guideline/drug/standard/textbook/general） */
  authorityLevel?: string;
  /** 其他元数据 */
  metadata?: Record<string, unknown>;
}

export interface RagQuery {
  knowledgeBases: string[];
  query: string;
  topK: number;
  scoreThreshold: number;
  strategy: 'vector' | 'keyword' | 'hybrid';
  authoritativeOnly?: boolean;
}

/** RAG 检索服务接口 */
export interface IRagRetriever {
  retrieve(query: RagQuery): Promise<RagChunk[]>;
  hasKnowledgeBase(name: string): boolean;
}

// ============================================================================
// 医疗工具调用服务
// ============================================================================

/** 工具调用入参（含医疗安全上下文由宿主从工作流上下文构造） */
export interface ToolInvokeInput {
  toolName: string;
  input: Record<string, unknown>;
  /** 风险等级（用于决定确认策略） */
  riskLevel?: 'low' | 'medium' | 'high';
  requireConfirmation?: boolean;
  requireDoubleConfirm?: boolean;
  readOnly?: boolean;
}

/** 医疗工具调用服务接口 */
export interface IToolInvoker {
  invoke(input: ToolInvokeInput): Promise<ToolResult<unknown>>;
  has(toolName: string): boolean;
  /** 工具是否只读 */
  isReadOnly(toolName: string): boolean;
  /** 工具风险等级 */
  riskLevel(toolName: string): 'low' | 'medium' | 'high' | undefined;
}

// ============================================================================
// 人工任务服务
// ============================================================================

/** 待处理人工任务 */
export interface PendingHumanTask {
  taskId: string;
  /** 工作流实例 ID */
  instanceId: string;
  /** 触发挂起的节点 ID */
  nodeId: string;
  title: string;
  instructions: string;
  assigneeRoles: string[];
  assigneeUserIds?: string[];
  formSchema?: Record<string, unknown>;
  /** 供审核人查看的上下文数据（已脱敏） */
  reviewData?: unknown;
  timeoutMs?: number;
  createdAt: number;
}

/** 人工任务处理结果 */
export interface HumanResolution {
  taskId: string;
  /** 是否通过/确认 */
  approved: boolean;
  /** 表单填写数据 */
  formData?: Record<string, unknown>;
  /** 审核人 ID */
  reviewerId?: string;
  /** 审核意见 */
  comment?: string;
  /** 双复核时的第二审核人 */
  secondReviewerId?: string;
}

/** 人工任务服务接口 */
export interface IHumanTaskHandler {
  /** 创建并持久化/下发人工任务 */
  createTask(task: PendingHumanTask): Promise<void>;
  /** 挂起等待，直到任务被处理（resume）或超时 */
  waitForResolution(task: PendingHumanTask): Promise<HumanResolution>;
  /** 由外部（BFF）在审核完成后调用，解除挂起 */
  resolve(taskId: string, resolution: HumanResolution): void;
}

// ============================================================================
// 子智能体调用服务
// ============================================================================

export interface SubAgentRequest {
  agentId: string;
  version?: string;
  input: Record<string, unknown>;
  mode: 'delegate' | 'consultation';
  consultationAgents?: string[];
  timeoutMs?: number;
}

export interface SubAgentResponse {
  output: unknown;
  tokens?: { input: number; output: number };
  /** consultation 模式下各专家意见 */
  opinions?: { agentId: string; output: unknown }[];
}

/** 子智能体调用服务接口 */
export interface ISubAgentInvoker {
  invoke(req: SubAgentRequest): Promise<SubAgentResponse>;
  has(agentId: string): boolean;
}

// ============================================================================
// 运行时服务集合
// ============================================================================

/** 工作流引擎运行时依赖 */
export interface WorkflowRuntime {
  llm: IWorkflowLlm;
  rag: IRagRetriever;
  tools: IToolInvoker;
  human: IHumanTaskHandler;
  subAgents: ISubAgentInvoker;
  /** 可选的休眠函数（便于测试加速） */
  sleep?: (ms: number) => Promise<void>;
  /** 事件回调（引擎级事件，供 UI/监控订阅） */
  onEvent?: (event: unknown) => void;
  /** 提示词资源加载器：将 "prompts/system.md" 这类引用解析为正文 */
  promptLoader?: (ref: string) => Promise<string> | string;
}

/** 默认休眠（真实延时） */
export const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * 健澜科技杠OS - 低代码智能体编排 DSL 类型（前端）
 *
 * 与后端 src/orchestrator/dsl/types.ts 对齐，使用可 JSON 序列化的字符串字面量，
 * 作为画布、属性面板、导入导出与前端 DAG 校验的共同模型。
 *
 * Copyright (c) 2026 健澜科技.
 */

import type { Edge, Node } from '@xyflow/react';

export type NodeType =
  | 'start'
  | 'end'
  | 'llm'
  | 'tool'
  | 'rag'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'human'
  | 'subagent'
  | 'code'
  | 'delay';

export type RiskLevel = 'low' | 'medium' | 'high';
export type ParallelMode = 'all' | 'any' | 'race';
export type LoopMode = 'while' | 'foreach';
export type RagStrategy = 'vector' | 'keyword' | 'hybrid';
export type IssueSeverity = 'error' | 'warning';

/** 节点配置（宽松索引，便于属性面板按类型读写） */
export interface NodeConfig {
  // llm
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  userTemplate?: string;
  jsonMode?: boolean;
  knowledgeBase?: string;
  // tool
  toolName?: string;
  inputMapping?: Record<string, string>;
  requireConfirmation?: boolean;
  requireDoubleConfirm?: boolean;
  readOnly?: boolean;
  // condition
  mode?: 'if-else' | 'switch';
  switchOn?: string;
  branches?: Array<{ name: string; when: string }>;
  cases?: Record<string, string>;
  defaultPort?: string;
  // loop
  loopMode?: LoopMode;
  whileCondition?: string;
  collection?: string;
  itemVariable?: string;
  indexVariable?: string;
  bodyEntry?: string;
  maxIterations?: number;
  // parallel
  parallelMode?: ParallelMode;
  concurrency?: number;
  parallelBranches?: Array<{ name: string; entryNode: string }>;
  requiredSuccessCount?: number;
  timeoutMs?: number;
  // human
  title?: string;
  instructions?: string;
  assigneeRoles?: string[];
  formSchema?: Record<string, unknown>;
  escalateToRoles?: string[];
  // subagent
  agentId?: string;
  collaborationMode?: 'delegate' | 'consultation';
  consultationAgents?: string[];
  // rag
  knowledgeBases?: string[];
  query?: string;
  topK?: number;
  scoreThreshold?: number;
  strategy?: RagStrategy;
  authoritativeOnly?: boolean;
  outputVariable?: string;
  // code
  assignments?: Record<string, string>;
  // delay
  durationMs?: number;
  // end
  outputMapping?: Record<string, string>;

  [key: string]: unknown;
}

export interface FlowNodeData {
  nodeType: NodeType;
  name: string;
  config: NodeConfig;
  description?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

/** 画布节点（React Flow Node + DSL 配置） */
export type BuilderNode = Node<FlowNodeData, 'medicalNode'>;

/** 画布边（React Flow Edge + 数据映射） */
export type BuilderEdge = Edge & {
  dataMapping?: Record<string, string>;
};

export interface AgentMeta {
  id: string;
  name: string;
  nameEn?: string;
  version: string;
  category: string;
  description: string;
  riskLevel: RiskLevel;
  allowedRoles: string[];
  tools: string[];
  knowledgeBases: string[];
  systemPrompt: string;
  model: string;
  temperature: number;
  tags: string[];
  builtin: boolean;
  disclaimer: string;
}

export interface ValidationIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** 市场清单项 */
export interface MarketAgent {
  id: string;
  name: string;
  category: string;
  riskLevel: RiskLevel;
  version: string;
  summary: string;
  humanInLoop: boolean;
  builtin?: boolean;
}

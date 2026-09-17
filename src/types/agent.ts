/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { ToolCall, ToolResult } from './tools';

// ============================================================
// Agent 事件
// ============================================================

/** Agent 事件类型联合类型 */
export type AgentEventType =
  | 'response_start' // 响应开始
  | 'response_delta' // 流式文本增量
  | 'response_end' // 响应结束
  | 'tool_call_start' // 工具调用开始
  | 'tool_call_progress' // 工具调用进度
  | 'tool_call_end' // 工具调用结束
  | 'tool_confirmation_required' // 需要工具确认
  | 'context_compaction' // 上下文压缩
  | 'error' // 错误
  | 'interrupted' // 中断
  | 'session_created' // 会话创建
  | 'session_completed' // 会话完成
  | 'agent_routed'; // Agent 路由

/**
 * Agent 事件
 *
 * Agent 执行过程中发出的事件，用于 UI 渲染和外部系统监听。
 */
export interface AgentEvent {
  /** 事件类型 */
  readonly type: AgentEventType;
  /** 会话ID */
  readonly sessionId: string;
  /** 事件时间戳 */
  readonly timestamp: number;
  /** 事件数据 */
  readonly data: unknown;
  /** 关联的工具调用ID（工具相关事件） */
  readonly toolCallId?: string;
  /** 事件来源Agent ID */
  readonly agentId?: string;
}

// ============================================================
// 会话状态
// ============================================================

/** 会话状态枚举 */
export type SessionStatus =
  | 'idle' // 空闲
  | 'thinking' // 思考中
  | 'tool_executing' // 工具执行中
  | 'responding' // 响应中
  | 'waiting_confirm' // 等待确认
  | 'interrupted' // 已中断
  | 'completed'; // 已完成

/** Token 使用量 */
export interface TokenUsage {
  /** 输入 Token 数 */
  input: number;
  /** 输出 Token 数 */
  output: number;
  /** 总 Token 数 */
  total: number;
}

/** Token 预算状态 */
export interface TokenBudget {
  /** 已使用 Token 数 */
  used: number;
  /** 总预算 Token 数 */
  total: number;
  /** 使用百分比（0-100） */
  percentage: number;
}

/**
 * 会话状态
 *
 * 表示当前 Agent 会话的运行状态，用于 UI 展示和状态监控。
 */
export interface SessionState {
  /** 会话状态 */
  readonly status: SessionStatus;
  /** 当前执行的工具名称 */
  readonly currentTool?: string;
  /** 消息总数 */
  readonly messageCount: number;
  /** Token 使用量 */
  readonly tokenUsage: TokenUsage;
  /** Token 预算 */
  readonly tokenBudget: TokenBudget;
  /** 当前患者ID */
  readonly currentPatientId?: string;
  /** 当前就诊ID */
  readonly currentEncounterId?: string;
  /** 待确认的工具调用列表 */
  readonly pendingConfirmations?: readonly {
    callId: string;
    toolName: string;
    confirmationToken: string;
  }[];
  /** 会话开始时间 */
  readonly startTime: number;
  /** 最后活动时间 */
  readonly lastActivityTime: number;
}

// ============================================================
// 上下文信息
// ============================================================

/** 上下文压缩级别 */
export type CompactionLevel =
  | 'none' // 未压缩
  | 'snip' // 裁剪（Level 1）
  | 'microcompact' // 微压缩（Level 2）
  | 'collapse' // 上下文折叠（Level 3）
  | 'autocompact'; // 自动压缩（Level 4）

/**
 * 上下文信息
 *
 * 描述当前 Agent 上下文的构建状态和压缩情况。
 */
export interface ContextInfo {
  /** 当前上下文 Token 数 */
  readonly currentTokens: number;
  /** 上下文最大 Token 数 */
  readonly maxTokens: number;
  /** 压缩级别 */
  readonly compactionLevel: CompactionLevel;
  /** 患者摘要 Token 占比 */
  readonly patientSummaryTokens: number;
  /** 就诊摘要 Token 占比 */
  readonly encounterSummaryTokens: number;
  /** 工具结果 Token 占比 */
  readonly toolResultTokens: number;
  /** 对话历史 Token 占比 */
  readonly conversationHistoryTokens: number;
  /** 系统提示词 Token 占比 */
  readonly systemPromptTokens: number;
  /** 已压缩的消息数 */
  readonly compactedMessageCount: number;
  /** 最后压缩时间 */
  readonly lastCompactionTime?: number;
}

// ============================================================
// Agent 请求与响应
// ============================================================

/** 请求优先级 */
export type RequestPriority = 'routine' | 'urgent' | 'stat';

/** 意图分类 */
export interface IntentClassification {
  /** 主意图 */
  primaryIntent: string;
  /** 子意图 */
  subIntent?: string;
  /** 置信度（0-1） */
  confidence: number;
  /** 提取的实体 */
  entities?: Record<string, unknown>;
}

/**
 * Agent 请求
 *
 * 发送给 Agent 执行的请求，包含用户输入和上下文信息。
 */
export interface AgentRequest {
  /** 请求唯一ID */
  readonly requestId: string;
  /** 会话ID */
  readonly sessionId: string;
  /** 用户输入内容 */
  readonly userInput: string;
  /** 优先级 */
  readonly priority: RequestPriority;
  /** 意图分类（如已识别） */
  readonly intent?: IntentClassification;
  /** 附加上下文数据 */
  readonly context?: Record<string, unknown>;
  /** 请求时间戳 */
  readonly timestamp: number;
  /** 超时时间（毫秒） */
  readonly timeoutMs?: number;
}

/**
 * Agent 响应
 *
 * Agent 执行完成后返回的响应，包含输出文本和工具调用记录。
 */
export interface AgentResponse {
  /** 响应唯一ID */
  readonly responseId: string;
  /** 关联的请求ID */
  readonly requestId: string;
  /** 会话ID */
  readonly sessionId: string;
  /** 执行的Agent ID */
  readonly agentId: string;
  /** 是否成功 */
  readonly success: boolean;
  /** 输出文本 */
  readonly output: string;
  /** 工具调用列表 */
  readonly toolCalls: readonly ToolCall[];
  /** 工具执行结果列表 */
  readonly toolResults: readonly ToolResult[];
  /** 置信度（0-1） */
  readonly confidence: number;
  /** 推理过程（可选） */
  readonly reasoning?: string;
  /** 执行耗时（毫秒） */
  readonly durationMs: number;
  /** Token 使用量 */
  readonly tokens: number;
  /** 错误信息（失败时） */
  readonly error?: {
    code: string;
    message: string;
  };
  /** 响应时间戳 */
  readonly timestamp: number;
}

// ============================================================
// 路由决策
// ============================================================

/** 目标Agent类型 */
export type TargetAgentType = 'main' | 'sub' | 'specialty';

/**
 * 路由决策
 *
 * 超级调度智能体根据用户意图做出的路由决策，
 * 决定将任务分发给哪个Agent执行。
 */
export interface RoutingDecision {
  /** 决策唯一ID */
  readonly decisionId: string;
  /** 目标Agent名称 */
  readonly targetAgent: string;
  /** 目标Agent类型 */
  readonly targetType: TargetAgentType;
  /** 任务描述 */
  readonly taskDescription: string;
  /** 输入数据 */
  readonly inputData: unknown;
  /** 限定工具集（如不指定则使用Agent默认工具集） */
  readonly tools?: readonly string[];
  /** 限定知识库范围 */
  readonly knowledgeScope?: string;
  /** 超时时间（毫秒） */
  readonly timeout: number;
  /** Token 预算 */
  readonly tokenBudget: number;
  /** 优先级 */
  readonly priority: RequestPriority;
  /** 路由原因（用于审计和调试） */
  readonly routingReason?: string;
  /** 置信度（0-1） */
  readonly confidence: number;
  /** 决策时间戳 */
  readonly timestamp: number;
}

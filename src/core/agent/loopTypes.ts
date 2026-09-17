/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * Agent 主循环内部类型定义
 *
 * 定义与 LLM Provider 解耦的规范化消息、内容块、流式事件类型。
 * LLMClient 负责在这些内部类型与具体 Provider（Anthropic / 通义 / 文心）
 * 的 API 格式之间双向转换，使主循环可被 Mock 与单测。
 */

// ============================================================
// 内容块
// ============================================================

/** 文本内容块 */
export interface TextBlock {
  readonly type: 'text';
  /** 文本内容 */
  readonly text: string;
}

/** 工具调用内容块（assistant 发起） */
export interface LoopToolUseBlock {
  readonly type: 'tool_use';
  /** 工具调用唯一ID */
  readonly id: string;
  /** 工具名称 */
  readonly name: string;
  /** 工具输入参数 */
  readonly input: Record<string, unknown>;
}

/** 工具结果内容块（回传给模型） */
export interface LoopToolResultBlock {
  readonly type: 'tool_result';
  /** 关联的工具调用ID */
  readonly toolUseId: string;
  /** 是否为错误结果 */
  readonly isError?: boolean;
  /** 结果内容（字符串或内容块数组） */
  readonly content: string;
}

/** 内容块联合类型 */
export type LoopContentBlock = TextBlock | LoopToolUseBlock | LoopToolResultBlock;

// ============================================================
// 规范化消息
// ============================================================

/** 规范化消息角色 */
export type LoopRole = 'user' | 'assistant';

/**
 * 规范化对话消息
 *
 * - user 消息：content 为文本或 tool_result 块数组；
 * - assistant 消息：content 为文本或 tool_use 块数组。
 */
export interface LoopMessage {
  /** 消息角色 */
  readonly role: LoopRole;
  /** 消息内容块列表 */
  readonly content: readonly LoopContentBlock[];
}

// ============================================================
// 工具 schema（Provider 无关）
// ============================================================

/**
 * 工具定义（用于请求模型）
 */
export interface LoopToolDefinition {
  /** 工具名称 */
  readonly name: string;
  /** 工具描述 */
  readonly description: string;
  /** JSON Schema 输入参数 */
  readonly inputSchema: Record<string, unknown>;
}

// ============================================================
// 流式事件
// ============================================================

/** 流式事件联合类型 */
export type LLMStreamEvent =
  | { type: 'message_start'; timestamp: number }
  | { type: 'text_delta'; text: string; timestamp: number }
  | {
      type: 'tool_use_start';
      id: string;
      name: string;
      timestamp: number;
    }
  | {
      type: 'tool_use_input_delta';
      id: string;
      partialJson: string;
      timestamp: number;
    }
  | { type: 'tool_use_end'; id: string; input: Record<string, unknown>; timestamp: number }
  | { type: 'message_delta'; stopReason: string | null; timestamp: number }
  | {
      type: 'message_stop';
      usage: { input: number; output: number };
      text: string;
      toolCalls: readonly LoopToolUseBlock[];
      stopReason: string | null;
      timestamp: number;
    };

// ============================================================
// LLM 请求参数
// ============================================================

/**
 * LLM 请求参数
 */
export interface LLMRequestParams {
  /** 系统提示词 */
  readonly system: string;
  /** 对话消息 */
  readonly messages: readonly LoopMessage[];
  /** 可用工具定义 */
  readonly tools: readonly LoopToolDefinition[];
  /** 最大输出 Token 数 */
  readonly maxTokens: number;
  /** 采样温度（可选） */
  readonly temperature?: number;
  /** 中断信号 */
  readonly signal?: AbortSignal;
}

/** 模型别名 */
export type ModelAlias = 'sonnet' | 'opus' | 'haiku';

/**
 * 模型配置
 */
export interface LLMModelConfig {
  /** 模型别名 */
  readonly alias: ModelAlias;
  /** 实际模型ID（如 claude-sonnet-4-5） */
  readonly model: string;
  /** 最大上下文 Token 数 */
  readonly contextWindow: number;
}

/**
 * 健澜科技数智医院智能体 - 对话模块类型定义
 *
 * 定义对话消息、工具调用、流式文本、引用等终端对话交互所需类型。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 对话消息类型
// ============================================================================

/** 对话消息角色 */
export type ChatMessageRole =
  | 'user' // 用户（医生）消息
  | 'assistant' // AI 助手回复
  | 'tool' // 工具调用
  | 'tool-result' // 工具执行结果
  | 'system' // 系统消息
  | 'error'; // 错误消息

/** 工具调用执行状态 */
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'failed';

/** 工具调用风险等级 */
export type ToolRiskLevel = 'low' | 'medium' | 'high';

/** 工具调用确认状态 */
export type ToolConfirmState = 'not-required' | 'pending' | 'confirmed' | 'rejected';

/** 工具调用信息 */
export interface ToolCallInfo {
  /** 工具调用唯一ID */
  toolCallId: string;
  /** 工具名称 */
  toolName: string;
  /** 工具图标（终端字符） */
  icon: string;
  /** 参数摘要 */
  argsSummary: string;
  /** 执行状态 */
  status: ToolCallStatus;
  /** 执行耗时（毫秒），完成后填充 */
  durationMs?: number;
  /** 风险等级 */
  riskLevel: ToolRiskLevel;
  /** 确认状态 */
  confirmState: ToolConfirmState;
  /** 结果摘要（短） */
  resultSummary?: string;
  /** 完整结果（长，可折叠） */
  resultDetail?: string;
}

/** 对话消息 */
export interface ChatMessage {
  /** 消息唯一ID */
  id: string;
  /** 消息角色 */
  role: ChatMessageRole;
  /** 消息正文（Markdown 纯文本） */
  content: string;
  /** 时间戳（ISO 或 HH:mm:ss） */
  timestamp: string;
  /** 是否正在流式输出 */
  streaming?: boolean;
  /** 关联的工具调用信息（role=tool/tool-result 时） */
  toolCall?: ToolCallInfo;
  /** 长内容是否折叠（默认折叠长工具结果） */
  collapsed?: boolean;
}

// ============================================================================
// 引用类型（@患者 / #医嘱 / $检验）
// ============================================================================

/** 引用类型 */
export type ChatRefKind = 'patient' | 'order' | 'lab';

/** 文本中的引用标记 */
export interface ChatReference {
  /** 引用类型 */
  kind: ChatRefKind;
  /** 引用显示文本 */
  label: string;
  /** 引用目标ID */
  refId: string;
}

// ============================================================================
// 输入模式（与 MedicalInputMode 对齐，独立定义以避免循环依赖）
// ============================================================================

/** 对话输入模式 */
export type ChatInputMode = 'consultation' | 'order' | 'ward-round' | 'consultation-md';

/** 输入模式元信息 */
export interface ChatInputModeInfo {
  /** 模式标识 */
  mode: ChatInputMode;
  /** 显示名称 */
  label: string;
  /** 模式图标 */
  icon: string;
  /** 占位符 */
  placeholder: string;
}

// ============================================================================
// Mock 数据辅助
// ============================================================================

/** 生成当前时间字符串 HH:mm:ss */
export function nowTime(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 生成消息ID
 * @param prefix - 前缀
 * @returns 消息ID
 */
export function makeMessageId(prefix = 'msg'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 对话 / 消息 / Agent 事件类型
 */
import type { ID } from './common';

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export type MessageStatus = 'streaming' | 'done' | 'error';

export interface ChatMessage {
  id: ID;
  conversationId: ID;
  role: ChatRole;
  content: string;
  delta?: string;
  status: MessageStatus;
  toolName?: string;
  createdAt: string;
}

export interface Conversation {
  id: ID;
  title: string;
  patientId?: ID;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
}

export type WsEventType =
  'agent:delta' | 'agent:done' | 'agent:error' | 'critical:alert' | 'message:push' | 'heartbeat';

export interface WsMessage<T = unknown> {
  event: WsEventType;
  refId?: string;
  payload: T;
  timestamp: number;
}

export interface AgentDeltaPayload {
  conversationId: ID;
  messageId: ID;
  delta: string;
  done: boolean;
}

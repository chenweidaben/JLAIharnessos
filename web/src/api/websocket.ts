/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 对话 WebSocket 封装：连接 /ws/chat（带 token）、发送 agent:start、订阅流式增量。
 *
 * 底层复用 @/services/websocket 的单例 wsClient（已实现：token 鉴权、心跳保活、指数退避自动重连）。
 * 协议（与 BFF 对齐）：
 *  - 发送：{ event: 'agent:start', conversationId, payload: { content } }
 *  - 接收：agent:delta（payload: AgentDeltaPayload）/ agent:done / agent:error
 */
import { wsClient } from '@/services/websocket';
import type { AgentDeltaPayload, WsMessage } from '@/types/chat';

export type DeltaCallback = (payload: AgentDeltaPayload) => void;
export type DoneCallback = (payload?: { conversationId?: string }) => void;
export type ErrorCallback = (error: { message?: string }) => void;

/** 对话 WebSocket 客户端（薄封装，避免重复建立连接） */
export class ChatWebSocketClient {
  /** 建立连接（已连接则幂等） */
  connect(): void {
    wsClient.connect();
  }

  /** 主动断开（不触发重连） */
  disconnect(): void {
    wsClient.disconnect();
  }

  /** 发送一轮对话：触发 Agent 开始处理 */
  sendMessage(content: string, conversationId: string): void {
    wsClient.send({ event: 'agent:start', conversationId, payload: { content } });
  }

  /** 订阅流式增量；返回取消订阅函数 */
  onDelta(cb: DeltaCallback): () => void {
    return wsClient.on('agent:delta', (msg: WsMessage) => {
      cb(msg.payload as AgentDeltaPayload);
    });
  }

  /** 订阅一轮结束 */
  onDone(cb: DoneCallback): () => void {
    return wsClient.on('agent:done', (msg: WsMessage) => {
      cb(msg.payload as { conversationId?: string });
    });
  }

  /** 订阅 Agent 错误 */
  onError(cb: ErrorCallback): () => void {
    return wsClient.on('agent:error', (msg: WsMessage) => {
      cb(msg.payload as { message?: string });
    });
  }
}

/** 全局单例 */
export const chatWs = new ChatWebSocketClient();
export default ChatWebSocketClient;

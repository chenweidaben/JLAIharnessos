/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * WebSocket Mock：用于 useChatStream / useAlert 等依赖 wsClient 的 Hook 测试
 * 通过 vi.mock('@/services/websocket') 替换真实实现
 */
import type { WsMessage, WsEventType } from '@/types/chat';

type Listener = (msg: WsMessage) => void;

/** 可手动控制的 Mock WebSocket 客户端 */
export class MockWsClient {
  private listeners = new Map<WsEventType, Set<Listener>>();
  public sent: unknown[] = [];
  public connected = false;

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  on(event: WsEventType, fn: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  subscribe(fn: Listener): () => void {
    const wrapper: Listener = (msg) => fn(msg);
    this.on('message:push', wrapper);
    return () => this.listeners.get('message:push')?.delete(wrapper);
  }

  send(data: unknown): void {
    this.sent.push(data);
  }

  /** 模拟服务端推送事件 */
  emit(event: WsEventType, payload: unknown, timestamp = Date.now()): void {
    const msg: WsMessage = { event, payload, timestamp };
    this.listeners.get(event)?.forEach((fn) => fn(msg));
  }

  /** 清空监听器 */
  reset(): void {
    this.listeners.clear();
    this.sent = [];
    this.connected = false;
  }
}

/** 单例 Mock 实例，供测试导入并手动触发事件 */
export const mockWsClient = new MockWsClient();

/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * WebSocket 客户端封装：连接管理 / 指数退避重连 / 心跳保活 / 事件订阅
 */
import type { WsEventType, WsMessage } from '@/types/chat';
import { env } from '@/utils/config';
import { tokenStorage } from '@/utils/auth';

type Listener = (message: WsMessage) => void;

const HEARTBEAT_INTERVAL = 30_000;
const MAX_RECONNECT_DELAY = 30_000;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Set<Listener>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 1_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private connecting = false;

  constructor(url?: string) {
    this.url = url ?? env.wsUrl;
  }

  connect(): void {
    if (this.connecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;
    this.connecting = true;
    this.manuallyClosed = false;

    const token = tokenStorage.getAccessToken();
    const url = token ? `${this.url}?token=${encodeURIComponent(token)}` : this.url;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connecting = false;
      this.reconnectDelay = 1_000;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        if (msg.event === 'heartbeat') return;
        this.listeners.forEach((fn) => fn(msg));
      } catch {
        /* ignore */
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.connecting = false;
      if (!this.manuallyClosed) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  on(event: WsEventType, fn: Listener): () => void {
    const wrapper: Listener = (msg) => {
      if (msg.event === event) fn(msg);
    };
    this.listeners.add(wrapper);
    return () => this.listeners.delete(wrapper);
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ event: 'heartbeat', payload: { ts: Date.now() } });
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }, this.reconnectDelay);
  }
}

export const wsClient = new WebSocketClient();
export default WebSocketClient;

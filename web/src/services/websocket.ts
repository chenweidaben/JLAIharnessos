/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * WebSocket 客户端封装：连接管理 / 指数退避重连 / 心跳保活 / 事件订阅
 */
import type { WsEventType, WsMessage } from '@/types/chat';
import { env } from '@/utils/config';
import { tokenStorage } from '@/utils/auth';
import { get } from './request';

type Listener = (message: WsMessage) => void;

const HEARTBEAT_INTERVAL = 30_000;
const MAX_RECONNECT_DELAY = 30_000;
const RECOVER_PAGE_SIZE = 100;

/** 补拉事件（outbox 已发布事件）的返回结构 */
interface RecoveredEvent {
  id: number;
  eventId: string;
  eventType: WsEventType;
  payload: unknown;
  publishedAt: string | null;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Set<Listener>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 1_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private connecting = false;
  /** 最后收到（含补拉）的 outbox 数字主键，用于重连补拉；0 表示尚未收到 */
  private lastSeq = 0;
  /** 本次连接是否为重连（用于在 onopen 时触发补拉） */
  private hasConnectedBefore = false;

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
      // 首次连接不补拉（hasConnectedBefore=false）；重连后补拉断连期间错过的事件
      if (this.hasConnectedBefore) void this.recoverGap();
      this.hasConnectedBefore = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        if (msg.event === 'heartbeat') return;
        if (typeof msg.seq === 'number') this.lastSeq = Math.max(this.lastSeq, msg.seq);
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

  /**
   * 重连补拉（gap recovery）：从 lastSeq 起分页拉取已发布事件并分发，
   * 补齐断连期间错过的事件。与实时帧重叠的事件（id <= lastSeq）跳过、不重复分发。
   * 补拉失败（断库/未授权）时静默放弃，等下次重连再试，不影响实时通道。
   */
  private async recoverGap(): Promise<void> {
    let cursor = this.lastSeq;
    for (;;) {
      let page: RecoveredEvent[];
      try {
        const data = await get<{ items: RecoveredEvent[] }>('/api/v1/outbox/events', {
          after_id: cursor,
          limit: RECOVER_PAGE_SIZE,
        });
        page = data.items;
      } catch {
        return;
      }
      if (!page || page.length === 0) return;
      for (const e of page) {
        // 实时帧可能已推进 lastSeq：跳过已覆盖事件，避免重复分发
        if (e.id <= this.lastSeq) {
          cursor = Math.max(cursor, e.id);
          continue;
        }
        const msg: WsMessage = {
          event: e.eventType,
          payload: e.payload,
          timestamp: e.publishedAt ? Date.parse(e.publishedAt) : Date.now(),
          seq: e.id,
        };
        this.listeners.forEach((fn) => fn(msg));
        this.lastSeq = Math.max(this.lastSeq, e.id);
        cursor = e.id;
      }
      if (page.length < RECOVER_PAGE_SIZE) return;
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

/**
 * 健澜科技 jlmedaios - WebSocket 客户端重连补拉（gap recovery）测试（M7-E）
 *
 * 用可控的假 WebSocket 与 mock 的 get，验证：
 *  - 首次连接 onopen 不补拉；
 *  - 收到带 seq 的消息更新 lastSeq；
 *  - 断连重连后调用 /api/v1/outbox/events 拉取错过事件并分发；
 *  - 与实时帧重叠（id <= lastSeq）的补拉事件跳过、不重复分发；
 *  - 补拉失败（get reject）静默放弃，不抛错。
 *
 * 注意：onopen 会启动 30s 心跳 setInterval，故测试中禁止 runAllTimers（会无限跑
 * 心跳）；只用 advanceTimersByTimeAsync 精确推进重连定时器，并用
 * advanceTimersByTimeAsync(0) flush microtask，最后 disconnect 停止心跳。
 *
 * Copyright (c) 2026 健澜科技有限公司
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WsMessage } from '@/types/chat';

vi.mock('@/services/request', () => ({ get: vi.fn() }));
vi.mock('@/utils/auth', () => ({
  tokenStorage: { getAccessToken: () => 'test-token' },
}));

import WebSocketClient from '@/services/websocket';
import { get } from '@/services/request';

const OPEN = 1;

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: unknown[] = [];
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: unknown): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }
  open(): void {
    this.readyState = OPEN;
    this.onopen?.();
  }
  message(msg: unknown): void {
    this.onmessage?.({ data: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  }
}

let clients: WebSocketClient[] = [];

beforeEach(() => {
  FakeSocket.instances = [];
  clients = [];
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.useFakeTimers();
  vi.mocked(get).mockReset();
});

afterEach(() => {
  // 停止所有客户端心跳/重连，避免 fake timer 残留
  for (const c of clients) c.disconnect();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function makeClient(url = 'ws://test'): WebSocketClient {
  const c = new WebSocketClient(url);
  clients.push(c);
  return c;
}

describe('M7-E WebSocket 重连补拉', () => {
  it('首次连接 onopen 不触发补拉', async () => {
    const client = makeClient();
    client.connect();
    FakeSocket.instances[0].open();
    await vi.advanceTimersByTimeAsync(0);
    expect(get).not.toHaveBeenCalled();
  });

  it('收到带 seq 的消息更新 lastSeq，重连后按 lastSeq 补拉并分发错过事件', async () => {
    const client = makeClient();
    const received: WsMessage[] = [];
    client.subscribe((m) => received.push(m));
    client.connect();
    const s1 = FakeSocket.instances[0];
    s1.open();
    // 收到一条 seq=5 的实时消息
    s1.message({ event: 'message:push', payload: { a: 1 }, timestamp: 100, seq: 5 });
    expect(received).toHaveLength(1);

    // 补拉返回 id=6、7 两条错过事件
    vi.mocked(get).mockResolvedValue({
      items: [
        { id: 6, eventId: 'e6', eventType: 'message:push', payload: { b: 2 }, publishedAt: null },
        { id: 7, eventId: 'e7', eventType: 'message:push', payload: { c: 3 }, publishedAt: null },
      ],
    });

    // 断连并推进重连定时器
    s1.close();
    await vi.advanceTimersByTimeAsync(1000);
    const s2 = FakeSocket.instances[1];
    s2.open(); // 重连，触发 recoverGap
    await vi.advanceTimersByTimeAsync(0); // flush recoverGap 的 microtask

    expect(get).toHaveBeenCalledWith('/api/v1/outbox/events', {
      after_id: 5,
      limit: 100,
    });
    // 补拉的两条事件被分发（共 1 实时 + 2 补拉）
    expect(received).toHaveLength(3);
    expect(received[1].seq).toBe(6);
    expect((received[1].payload as { b: number }).b).toBe(2);
    expect(received[2].seq).toBe(7);
  });

  it('补拉事件 id <= lastSeq（实时帧已覆盖）时跳过，不重复分发', async () => {
    const client = makeClient();
    const received: WsMessage[] = [];
    client.subscribe((m) => received.push(m));
    client.connect();
    const s1 = FakeSocket.instances[0];
    s1.open();
    s1.message({ event: 'message:push', payload: { a: 1 }, timestamp: 1, seq: 5 });
    s1.close();
    vi.mocked(get).mockResolvedValue({
      items: [
        { id: 6, eventId: 'e6', eventType: 'message:push', payload: { b: 2 }, publishedAt: null },
        { id: 7, eventId: 'e7', eventType: 'message:push', payload: { c: 3 }, publishedAt: null },
      ],
    });
    await vi.advanceTimersByTimeAsync(1000);
    const s2 = FakeSocket.instances[1];
    // 重连后，实时帧先到 seq=6（更新 lastSeq=6）
    s2.open();
    s2.message({ event: 'message:push', payload: { b: 2 }, timestamp: 2, seq: 6 });
    await vi.advanceTimersByTimeAsync(0); // flush recoverGap
    // 实时帧 seq=6 已分发；补拉的 id=6 被跳过，id=7 分发
    expect(received.filter((m) => m.seq === 6)).toHaveLength(1);
    expect(received.some((m) => m.seq === 7)).toBe(true);
  });

  it('补拉失败（get reject）静默放弃，不抛错、不影响连接', async () => {
    const client = makeClient();
    client.connect();
    const s1 = FakeSocket.instances[0];
    s1.open();
    s1.message({ event: 'message:push', payload: {}, timestamp: 1, seq: 3 });
    s1.close();
    vi.mocked(get).mockRejectedValue(new Error('network'));
    await vi.advanceTimersByTimeAsync(1000);
    const s2 = FakeSocket.instances[1];
    expect(() => s2.open()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    expect(get).toHaveBeenCalled();
  });
});

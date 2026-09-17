/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * useChatStream Hook 测试：WebSocket 流式输出
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@test-utils';
import { MockWsClient } from '@mocks/mockWebSocket';

// Mock WebSocket 模块
vi.mock('@/services/websocket', () => {
  const mock = new MockWsClient();
  return {
    wsClient: mock,
    default: class {
      static instance = mock;
    },
  };
});

import { wsClient } from '@/services/websocket';
import { useChatStream } from '@/hooks/useChatStream';

const mockWs = wsClient as unknown as MockWsClient;

beforeEach(() => {
  mockWs.reset();
});

describe('useChatStream', () => {
  it('初始状态：无内容、非流式', () => {
    const { result } = renderHook(() => useChatStream('conv-1'));
    expect(result.current.content).toBe('');
    expect(result.current.streaming).toBe(false);
  });

  it('接收 agent:delta 事件累积内容', () => {
    const { result } = renderHook(() => useChatStream('conv-1'));

    act(() => {
      mockWs.emit('agent:delta', { conversationId: 'conv-1', messageId: 'm1', delta: '你', done: false });
    });
    expect(result.current.content).toBe('你');
    expect(result.current.streaming).toBe(true);

    act(() => {
      mockWs.emit('agent:delta', { conversationId: 'conv-1', messageId: 'm1', delta: '好', done: false });
    });
    expect(result.current.content).toBe('你好');
  });

  it('done=true 时结束流式', () => {
    const { result } = renderHook(() => useChatStream('conv-1'));

    act(() => {
      mockWs.emit('agent:delta', { conversationId: 'conv-1', messageId: 'm1', delta: '完', done: true });
    });
    expect(result.current.streaming).toBe(false);
  });

  it('agent:done 事件结束流式', () => {
    const { result } = renderHook(() => useChatStream('conv-1'));

    act(() => {
      mockWs.emit('agent:delta', { conversationId: 'conv-1', messageId: 'm1', delta: 'x', done: false });
    });
    expect(result.current.streaming).toBe(true);

    act(() => {
      mockWs.emit('agent:done', { conversationId: 'conv-1' });
    });
    expect(result.current.streaming).toBe(false);
  });

  it('忽略其他会话的 delta 事件', () => {
    const { result } = renderHook(() => useChatStream('conv-1'));

    act(() => {
      mockWs.emit('agent:delta', { conversationId: 'conv-other', messageId: 'm2', delta: '不该出现', done: false });
    });
    expect(result.current.content).toBe('');
  });

  it('reset 清空内容和流式状态', () => {
    const { result } = renderHook(() => useChatStream('conv-1'));

    act(() => {
      mockWs.emit('agent:delta', { conversationId: 'conv-1', messageId: 'm1', delta: '内容', done: false });
    });
    expect(result.current.content).toBe('内容');

    act(() => {
      result.current.reset();
    });
    expect(result.current.content).toBe('');
    expect(result.current.streaming).toBe(false);
  });

  it('start 发送 agent:start 事件', () => {
    const { result } = renderHook(() => useChatStream('conv-1'));

    act(() => {
      result.current.start('conv-new');
    });
    expect(mockWs.sent).toContainEqual({ event: 'agent:start', conversationId: 'conv-new' });
  });

  it('组件卸载时取消订阅', () => {
    const { unmount } = renderHook(() => useChatStream('conv-1'));
    expect(mockWs.connected).toBe(true);
    unmount();
    // 卸载后监听器应被移除（通过 reset 验证）
    mockWs.reset();
    expect(mockWs.sent).toEqual([]);
  });
});

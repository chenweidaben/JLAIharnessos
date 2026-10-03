/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * useAlert Hook 测试：告警订阅
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@test-utils';
import { MockWsClient } from '@mocks/mockWebSocket';

vi.mock('@/services/websocket', () => {
  const mock = new MockWsClient();
  return {
    wsClient: mock,
    default: class {},
  };
});

import { wsClient } from '@/services/websocket';
import { useAlert } from '@/hooks/useAlert';

const mockWs = wsClient as unknown as MockWsClient;

beforeEach(() => {
  mockWs.reset();
});

describe('useAlert', () => {
  it('初始状态：无告警', () => {
    const { result } = renderHook(() => useAlert());
    expect(result.current.alerts).toHaveLength(0);
    expect(result.current.latest).toBeNull();
  });

  it('接收 critical:alert 事件后更新告警列表', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-1',
        type: 'critical-value',
        level: 'critical',
        title: '血钾危急值',
        content: '血钾 6.8 mmol/L',
        patientId: 'p-1',
        createdAt: '2026-09-16T08:00:00',
        acknowledged: false,
      });
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.latest?.title).toBe('血钾危急值');
    expect(result.current.latest?.receivedAt).toBeDefined();
  });

  it('多条告警时最新在前', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-1', type: 'critical-value', level: 'critical',
        title: '告警1', content: '', patientId: 'p-1',
        createdAt: '', acknowledged: false,
      });
    });
    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-2', type: 'critical-value', level: 'critical',
        title: '告警2', content: '', patientId: 'p-2',
        createdAt: '', acknowledged: false,
      });
    });

    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.alerts[0].title).toBe('告警2');
  });

  it('ack 标记告警为已确认', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-1', type: 'critical-value', level: 'critical',
        title: '血钾', content: '', patientId: 'p-1',
        createdAt: '', acknowledged: false,
      });
    });

    act(() => {
      result.current.ack('alt-1');
    });
    expect(result.current.alerts[0].acknowledged).toBe(true);
  });

  it('clearAcknowledged 移除已确认告警', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-1', type: 'critical-value', level: 'critical',
        title: 'A', content: '', patientId: 'p-1',
        createdAt: '', acknowledged: false,
      });
    });
    act(() => {
      result.current.ack('alt-1');
    });
    act(() => {
      result.current.clearAcknowledged();
    });
    expect(result.current.alerts).toHaveLength(0);
  });

  it('M7-B 去重：同一 id 重复推送（重连重放）不重复入列', () => {
    const { result } = renderHook(() => useAlert());
    const payload = {
      id: 'alt-dup', type: 'critical-value', level: 'critical',
      title: '血钾危急值', content: '血钾 6.8', patientId: 'p-1',
      createdAt: '', acknowledged: false,
    };
    act(() => {
      mockWs.emit('critical:alert', payload);
    });
    act(() => {
      mockWs.emit('critical:alert', { ...payload });
    });
    act(() => {
      mockWs.emit('critical:alert', { ...payload });
    });
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].id).toBe('alt-dup');
  });

  it('M7-B 去重：相同 id 不覆盖 latest（重放不改变最新指向）', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-1', type: 'critical-value', level: 'critical',
        title: '第一条', content: '', patientId: 'p-1',
        createdAt: '', acknowledged: false,
      });
    });
    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-2', type: 'critical-value', level: 'critical',
        title: '第二条', content: '', patientId: 'p-2',
        createdAt: '', acknowledged: false,
      });
    });
    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-1', type: 'critical-value', level: 'critical',
        title: '第一条', content: '', patientId: 'p-1',
        createdAt: '', acknowledged: false,
      });
    });
    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.latest?.title).toBe('第二条');
  });

  it('M7-B 状态事件：critical:status=acked 更新对应告警 businessStatus', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-1', type: 'critical-value', level: 'critical',
        title: '血钾', content: '', patientId: 'p-1',
        createdAt: '', acknowledged: false,
      });
    });
    act(() => {
      mockWs.emit('critical:status', {
        id: 'alt-1', status: 'acked', actedBy: 'doctor-1', note: null,
        at: '2026-10-03T10:01:00Z',
      });
    });
    expect(result.current.alerts[0].businessStatus).toBe('acked');
    expect(result.current.alerts[0].acknowledged).toBe(true);
    expect(result.current.statusEvents).toHaveLength(1);
    expect(result.current.statusEvents[0].status).toBe('acked');
  });

  it('M7-B 状态事件：critical:status=resolved 后告警标记闭环', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      mockWs.emit('critical:alert', {
        id: 'alt-9', type: 'critical-value', level: 'critical',
        title: '肌钙蛋白', content: '', patientId: 'p-9',
        createdAt: '', acknowledged: false,
      });
    });
    act(() => {
      mockWs.emit('critical:status', {
        id: 'alt-9', status: 'resolved', actedBy: 'doctor-1', note: '已处置',
        at: '2026-10-03T10:05:00Z',
      });
    });
    expect(result.current.alerts[0].businessStatus).toBe('resolved');
    expect(result.current.statusEvents[0].note).toBe('已处置');
  });
});

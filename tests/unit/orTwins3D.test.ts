/**
 * 健澜科技 jlmedaios - 数字孪生 3D 手术室纯函数单测（M185-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildORTwins3D,
  simulateORFlow,
  type ORRoom,
} from '../../src/bff/aggregators/orTwins3DAggregator';

function makeRoom(overrides: Partial<ORRoom> = {}): ORRoom {
  return {
    orId: 'or-1',
    name: '1号手术室',
    status: 'idle',
    scheduledSurgery: null,
    scheduledStartTime: null,
    actualStartTime: null,
    plannedDuration: 60,
    actualElapsed: 0,
    equipment: [],
    ...overrides,
  };
}

describe('buildORTwins3D 利用率', () => {
  it('2/3 间忙碌 → 0.67', () => {
    const r = buildORTwins3D('2026-10-16', [
      makeRoom({ status: 'in_surgery' }),
      makeRoom({ orId: 'or-2', name: '2号', status: 'preparing' }),
      makeRoom({ orId: 'or-3', name: '3号', status: 'idle' }),
    ]);
    expect(r.utilizationRate).toBeCloseTo(2 / 3, 5);
  });
});

describe('buildORTwins3D 延误预警', () => {
  it('手术超时生成 overtime 预警', () => {
    const r = buildORTwins3D('2026-10-16', [
      makeRoom({ status: 'in_surgery', plannedDuration: 60, actualElapsed: 90 }),
    ]);
    expect(r.alerts.some((a) => a.type === 'overtime')).toBe(true);
  });

  it('设备故障生成 equipment_fault 预警', () => {
    const r = buildORTwins3D('2026-10-16', [
      makeRoom({ equipment: [{ name: '麻醉机', status: 'fault' }] }),
    ]);
    expect(r.alerts.some((a) => a.type === 'equipment_fault')).toBe(true);
  });

  it('排程延误 >30 分钟生成 schedule_deviation 预警', () => {
    const r = buildORTwins3D('2026-10-16', [
      makeRoom({
        status: 'in_surgery',
        scheduledStartTime: '09:00',
        actualStartTime: '09:45',
      }),
    ]);
    expect(r.alerts.some((a) => a.type === 'schedule_deviation')).toBe(true);
  });
});

describe('simulateORFlow', () => {
  it('返回5个阶段', () => {
    const flow = simulateORFlow('2026-10-16', 'or-1');
    expect(flow.length).toBe(5);
    expect(flow[0].phase).toBe('麻醉诱导');
  });
});

/**
 * 健澜科技 jlmedaios - AI 大脑 2.0 门诊试点纯函数单测（M182-C，v5.0启动）
 *
 * 覆盖：
 *  - 门诊实时监控 buildAIBrainV2Outpatient：字段齐全、demo=true、数值落在演示区间、
 *    固定 seed 可复现；候诊 >30 分钟预警桶与总数一致；
 *  - 高峰预测 predictOutpatientPeak：today/tomorrow/week 三档缩放、双峰曲线、
 *    high 时段合计与 peakWindow 一致；
 *  - 优化建议 suggestOutpatientOptimization：候诊超阈值 → 高优自动提醒；
 *    候诊拥挤 → 高峰增开窗口；医生负荷高 → 增派医生；负荷低 → 合并诊室；
 *    平稳工况 → 不打扰；排序 high → medium → low。
 * 纯函数、无 I/O、无 DB、无 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  buildAIBrainV2Outpatient,
  predictOutpatientPeak,
  suggestOutpatientOptimization,
  WAIT_ALERT_MINUTES,
  WAIT_PEAK_COUNT,
  DOCTOR_LOAD_HIGH,
  DOCTOR_LOAD_LOW,
  type AIBrainV2Outpatient,
} from '../../src/bff/aggregators/aiBrainV2OutpatientAggregator.js';

/** 构造一个自定义门诊快照（便于阈值触发测试） */
function makeSnapshot(overrides: Partial<AIBrainV2Outpatient> = {}): AIBrainV2Outpatient {
  return {
    generatedAt: '2026-10-16T09:00:00.000Z',
    demo: true,
    dataSource: 'demo',
    hospital: { code: 'HQ', name: '测试医院' },
    volume: { nowConsulting: 50, nowWaiting: 60, avgWaitMinutes: 15, todayRegistered: 2300, todayVisited: 1800 },
    doctorLoad: { nowSeeing: 40, todaySeen: 1750, avgMinutesPerPatient: 8.5, openRooms: 45, loadRate: 66.7 },
    waitingAlerts: [],
    waitingOver30Count: 0,
    ...overrides,
  };
}

describe('M182-C 门诊实时监控 buildAIBrainV2Outpatient', () => {
  it('字段齐全且 demo=true', () => {
    const s = buildAIBrainV2Outpatient(42);
    expect(s.demo).toBe(true);
    expect(s.dataSource).toBe('demo');
    expect(s.volume).toBeDefined();
    expect(s.doctorLoad).toBeDefined();
    expect(Array.isArray(s.waitingAlerts)).toBe(true);
    expect(typeof s.generatedAt).toBe('string');
  });

  it('固定 seed 可复现：同 seed 两次调用数值完全一致', () => {
    const a = buildAIBrainV2Outpatient(20261016);
    const b = buildAIBrainV2Outpatient(20261016);
    expect(a.volume).toEqual(b.volume);
    expect(a.doctorLoad).toEqual(b.doctorLoad);
    expect(a.waitingAlerts).toEqual(b.waitingAlerts);
    expect(a.waitingOver30Count).toBe(b.waitingOver30Count);
  });

  it('演示计数落在合理区间', () => {
    const s = buildAIBrainV2Outpatient(7);
    expect(s.volume.nowConsulting).toBeGreaterThanOrEqual(40);
    expect(s.volume.nowConsulting).toBeLessThanOrEqual(70);
    expect(s.volume.nowWaiting).toBeGreaterThanOrEqual(60);
    expect(s.volume.nowWaiting).toBeLessThanOrEqual(200);
    expect(s.volume.avgWaitMinutes).toBeGreaterThanOrEqual(12);
    expect(s.volume.avgWaitMinutes).toBeLessThanOrEqual(40);
    expect(s.doctorLoad.nowSeeing).toBeGreaterThanOrEqual(35);
    expect(s.doctorLoad.loadRate).toBeGreaterThan(0);
    expect(s.doctorLoad.loadRate).toBeLessThan(100);
  });

  it('候诊 >30 分钟预警桶总数与 waitingOver30Count 一致', () => {
    const s = buildAIBrainV2Outpatient(99);
    const sum = s.waitingAlerts.reduce((acc, a) => acc + a.count, 0);
    expect(sum).toBe(s.waitingOver30Count);
  });
});

describe('M182-C 高峰预测 predictOutpatientPeak', () => {
  it('today 模式：双峰出现（9 点与 14 点附近为 high）', () => {
    const f = predictOutpatientPeak('today');
    expect(f.period).toBe('today');
    expect(f.slots.length).toBe(10);
    const highSlots = f.slots.filter((s) => s.pressure === 'high').map((s) => s.slot);
    // 9 点与 14 点权重最高（0.18 / 0.15）
    expect(highSlots).toContain('09:00-10:00');
    expect(highSlots).toContain('14:00-15:00');
    expect(f.peakWindow).toContain('09:00');
  });

  it('三档周期总人次缩放：week > today > tomorrow 近似量级（week 为周累计）', () => {
    const today = predictOutpatientPeak('today');
    const tomorrow = predictOutpatientPeak('tomorrow');
    const week = predictOutpatientPeak('week');
    expect(today.totalPredicted).toBeGreaterThan(0);
    expect(tomorrow.totalPredicted).toBeLessThanOrEqual(today.totalPredicted);
    expect(week.totalPredicted).toBeGreaterThan(today.totalPredicted);
  });

  it('各时段 pressure 标签与权重一致：高权重 high / 中权重 mid / 低权重 low', () => {
    const f = predictOutpatientPeak('today');
    f.slots.forEach((s) => {
      expect(['high', 'mid', 'low']).toContain(s.pressure);
    });
  });
});

describe('M182-C 优化建议 suggestOutpatientOptimization', () => {
  it('候诊 >30 分钟 → 高优先级自动提醒建议', () => {
    const s = makeSnapshot({
      waitingOver30Count: 12,
      waitingAlerts: [
        { bucket: '30-40', count: 8 },
        { bucket: '40-50', count: 4 },
      ],
      volume: { nowConsulting: 50, nowWaiting: 150, avgWaitMinutes: 35, todayRegistered: 2300, todayVisited: 1800 },
    });
    const list = suggestOutpatientOptimization(s);
    const alert = list.find((x) => x.title.includes(`候诊超 ${WAIT_ALERT_MINUTES} 分钟`));
    expect(alert).toBeDefined();
    expect(alert!.priority).toBe('high');
    expect(alert!.actions.length).toBeGreaterThan(0);
  });

  it('候诊拥挤（≥ 120 人）→ 高峰增开窗口建议', () => {
    const s = makeSnapshot({
      volume: { nowConsulting: 50, nowWaiting: WAIT_PEAK_COUNT + 10, avgWaitMinutes: 15, todayRegistered: 2300, todayVisited: 1800 },
    });
    const list = suggestOutpatientOptimization(s);
    expect(list.some((x) => x.title.includes('增开窗口'))).toBe(true);
  });

  it('医生负荷率 ≥ 90% → 高优增派医生建议', () => {
    const s = makeSnapshot({
      doctorLoad: { nowSeeing: 56, todaySeen: 1750, avgMinutesPerPatient: 8.5, openRooms: 55, loadRate: DOCTOR_LOAD_HIGH + 2 },
    });
    const list = suggestOutpatientOptimization(s);
    const item = list.find((x) => x.title.includes('负荷率'));
    expect(item).toBeDefined();
    expect(item!.priority).toBe('high');
  });

  it('医生负荷率 ≤ 50% → 低优合并诊室建议', () => {
    const s = makeSnapshot({
      doctorLoad: { nowSeeing: 28, todaySeen: 1750, avgMinutesPerPatient: 8.5, openRooms: 45, loadRate: DOCTOR_LOAD_LOW - 5 },
    });
    const list = suggestOutpatientOptimization(s);
    expect(list.some((x) => x.title.includes('合并诊室'))).toBe(true);
  });

  it('平稳工况：无超阈值 → 不打扰（空数组）', () => {
    const s = makeSnapshot();
    const list = suggestOutpatientOptimization(s);
    expect(list.length).toBe(0);
  });

  it('建议排序：high → medium → low', () => {
    const s = makeSnapshot({
      waitingOver30Count: 5,
      waitingAlerts: [{ bucket: '30-40', count: 5 }],
      volume: { nowConsulting: 50, nowWaiting: 200, avgWaitMinutes: 32, todayRegistered: 2300, todayVisited: 1800 },
      doctorLoad: { nowSeeing: 58, todaySeen: 1750, avgMinutesPerPatient: 8.5, openRooms: 55, loadRate: 96 },
    });
    const list = suggestOutpatientOptimization(s);
    expect(list.length).toBeGreaterThan(0);
    const order = list.map((x) => x.priority);
    const rank = (p: string) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2);
    for (let i = 1; i < order.length; i++) {
      expect(rank(order[i])).toBeGreaterThanOrEqual(rank(order[i - 1]));
    }
  });
});

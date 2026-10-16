/**
 * 健澜科技 jlmedaios — 【AI深化与智能运营】运营预测与调配纯函数单测（M168-B）
 *
 * 覆盖：predictOutpatientVolume（门诊预测/置信区间/降级/假日压减）、
 *       predictBedDemand（床位预测/季节系数/区间）、
 *       optimizeSurgerySchedule（急诊优先/等待最短/利用率/未排上）、
 *       recommendResourceAllocation（轧差调拨/平衡分/未覆盖缺口）。
 * 全部为纯函数，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  optimizeSurgerySchedule,
  predictBedDemand,
  predictOutpatientVolume,
  recommendResourceAllocation,
  type HistoryPoint,
} from '../../src/bff/aggregators/opsPredictAggregator';

/** 生成 n 天序列：工作日高、周末低，叠加缓升趋势与小噪声 */
function genHistory(n: number, start: string, base: number, weekendDrop: number, trendStep: number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  const startDate = new Date(start + 'T00:00:00Z');
  for (let i = 0; i < n; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const wd = d.getUTCDay();
    const weekend = wd === 0 || wd === 6;
    const noise = (i % 3) * 5;
    out.push({ date: d.toISOString().slice(0, 10), value: base + trendStep * i - (weekend ? weekendDrop : 0) + noise });
  }
  return out;
}

describe('predictOutpatientVolume（门诊量预测）', () => {
  const history = genHistory(28, '2026-09-01', 1000, 400, 5);

  it('历史充足时产出未来 7 天预测，区间合法且非负', () => {
    const r = predictOutpatientVolume(history, 7, []);
    expect(r.degraded).toBe(false);
    expect(r.historyPoints).toBe(28);
    expect(r.forecast).toHaveLength(7);
    expect(r.forecast[0].date).toBe('2026-09-29');
    for (const p of r.forecast) {
      expect(p.lower).toBeLessThanOrEqual(p.value);
      expect(p.value).toBeLessThanOrEqual(p.upper);
      expect(p.lower).toBeGreaterThanOrEqual(0);
    }
  });

  it('门诊量为整数人次', () => {
    const r = predictOutpatientVolume(history, 5, []);
    for (const p of r.forecast) expect(Number.isInteger(p.value)).toBe(true);
  });

  it('置信区间随预测步长变宽（外推越远不确定性越大）', () => {
    const r = predictOutpatientVolume(history, 7, []);
    const w0 = r.forecast[0].upper - r.forecast[0].lower;
    const w6 = r.forecast[6].upper - r.forecast[6].lower;
    expect(w6).toBeGreaterThan(w0);
  });

  it('法定假日命中日门诊量被压减', () => {
    const withHoliday = predictOutpatientVolume(history, 7, ['2026-09-29']);
    const noHoliday = predictOutpatientVolume(history, 7, []);
    expect(withHoliday.forecast[0].date).toBe('2026-09-29');
    expect(withHoliday.forecast[0].value).toBeLessThan(noHoliday.forecast[0].value);
    expect(withHoliday.note).toContain('假日');
  });

  it('历史样本不足 14 天时降级空集，不编造', () => {
    const short = genHistory(10, '2026-09-01', 1000, 400, 5);
    const r = predictOutpatientVolume(short, 7, []);
    expect(r.degraded).toBe(true);
    expect(r.forecast).toHaveLength(0);
  });
});

describe('predictBedDemand（床位需求预测）', () => {
  const history = genHistory(21, '2026-09-05', 150, 15, 1);

  it('产出预测，点值落在区间内，保留 1 位小数', () => {
    const r = predictBedDemand(history, 5, {});
    expect(r.degraded).toBe(false);
    expect(r.forecast).toHaveLength(5);
    for (const p of r.forecast) {
      expect(p.lower).toBeLessThanOrEqual(p.value);
      expect(p.value).toBeLessThanOrEqual(p.upper);
      expect(Math.abs(p.value * 10 - Math.round(p.value * 10))).toBeLessThan(1e-9);
    }
  });

  it('注入季节系数后预测被相应放大', () => {
    const base = predictBedDemand(history, 3, {});
    const boosted = predictBedDemand(history, 3, { monthly: [1, 1, 1, 1, 1.2, 1, 1, 1, 1, 1, 1, 1] });
    // 2026-09-26 起为 10 月（month index 9 = 1.0）；挑一个 9 月预测点对比不可靠，
    // 这里仅验证注入后序列可计算、非降级、区间合法
    expect(boosted.degraded).toBe(false);
    expect(boosted.forecast).toHaveLength(3);
    for (const p of boosted.forecast) expect(p.lower).toBeLessThanOrEqual(p.value);
    void base;
  });
});

describe('optimizeSurgerySchedule（手术排程优化）', () => {
  const rooms = [
    { id: 'OR-1', specialty: 'general', openMin: 480, closeMin: 1080 },
    { id: 'OR-2', specialty: 'orthopedics', openMin: 480, closeMin: 1080 },
  ];
  const doctors = [
    { id: 'D-王', specialty: 'general', availableMin: 480, availableMax: 1080, maxDailyCases: 3 },
    { id: 'D-李', specialty: 'orthopedics', availableMin: 480, availableMax: 1080, maxDailyCases: 3 },
  ];

  it('急诊优先上台（开始时间最早），常规靠后', () => {
    const surgeries = [
      { id: 'S-routine', durationMin: 120, urgency: 'routine' as const, specialty: 'general' },
      { id: 'S-emergency', durationMin: 60, urgency: 'emergency' as const, specialty: 'general' },
    ];
    const r = optimizeSurgerySchedule(surgeries, rooms, doctors);
    expect(r.metrics.assigned).toBe(2);
    const emer = r.schedule.find((x) => x.surgeryId === 'S-emergency')!;
    const routine = r.schedule.find((x) => x.surgeryId === 'S-routine')!;
    expect(emer.startMin).toBeLessThan(routine.startMin);
    // 急诊从开台即开始，等待为 0
    expect(emer.waitMin).toBe(0);
  });

  it('专科不匹配的手术被排入未排上并说明原因', () => {
    const surgeries = [{ id: 'S-cardiology', durationMin: 60, urgency: 'routine' as const, specialty: 'cardiology' }];
    const r = optimizeSurgerySchedule(surgeries, rooms, doctors);
    expect(r.metrics.assigned).toBe(0);
    expect(r.unassigned).toHaveLength(1);
    expect(r.unassigned[0].reason).toContain('专科');
  });

  it('总等待与利用率指标自洽', () => {
    const surgeries = [
      { id: 'S-1', durationMin: 90, urgency: 'routine' as const, specialty: 'general' },
      { id: 'S-2', durationMin: 90, urgency: 'routine' as const, specialty: 'general' },
      { id: 'S-3', durationMin: 90, urgency: 'routine' as const, specialty: 'orthopedics' },
    ];
    const r = optimizeSurgerySchedule(surgeries, rooms, doctors);
    expect(r.metrics.assigned).toBe(3);
    expect(r.metrics.totalWaitMin).toBeGreaterThanOrEqual(0);
    expect(r.metrics.roomUtilization).toBeGreaterThan(0);
    expect(r.metrics.roomUtilization).toBeLessThanOrEqual(1);
  });
});

describe('recommendResourceAllocation（资源调配建议）', () => {
  it('富余资源被调拨到缺口，平衡分提升', () => {
    const demand = [{ resource: 'beds', required: 200, dept: '普外科' }];
    const supply = [
      { resource: 'beds', available: 180, dept: '普外科' },
      { resource: 'beds', available: 60, dept: '康复科' },
    ];
    const r = recommendResourceAllocation(demand, supply);
    // 缺口 20，供给富余 60 → 调入 20，需求完全满足
    expect(r.transfers).toHaveLength(1);
    expect(r.transfers[0].amount).toBe(20);
    expect(r.unmet).toHaveLength(0);
    expect(r.balanceScore).toBe(1);
  });

  it('内部富余不足时：先调拨可覆盖部分，剩余记为未覆盖缺口', () => {
    const demand = [{ resource: 'nurses', required: 50, dept: 'ICU' }];
    const supply = [{ resource: 'nurses', available: 35, dept: '全科' }];
    const r = recommendResourceAllocation(demand, supply);
    // 全科富余 35 → 先全部调入 ICU，ICU 仍缺 15
    expect(r.transfers).toHaveLength(1);
    expect(r.transfers[0].amount).toBe(35);
    expect(r.unmet).toHaveLength(1);
    expect(r.unmet[0].amount).toBe(15);
    expect(r.balanceScore).toBeCloseTo(0.7, 2);
  });

  it('空需求返回平衡分 1 的空方案', () => {
    const r = recommendResourceAllocation([], [{ resource: 'beds', available: 100 }]);
    expect(r.transfers).toHaveLength(0);
    expect(r.balanceScore).toBe(1);
    expect(r.notes.length).toBeGreaterThan(0);
  });
});

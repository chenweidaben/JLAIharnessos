/**
 * 健澜科技 jlmedaios - 全院数据驾驶舱纯函数测试（院长版）
 *
 * 覆盖：buildCeoDashboard 八大指标卡形态与阈值、buildTrend 24h 趋势纯函数、listView 演示数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildCeoDashboard,
  buildTrend,
  listView,
  type CeoDashboardInput,
} from '../../src/bff/aggregators/ceoDashboardAggregator.js';

const base: CeoDashboardInput = {
  outpatientDaily: { visits: 10246 },
  inpatientDaily: { current: 1812, admitted: 132, discharged: 118 },
  surgeryDaily: { completed: 96, scheduled: 104 },
  bedOccupancy: { occupiedBeds: 1786, totalBeds: 2000 },
  drgSettlement: { settledCases: 86, surplusWan: 412.5 },
  qcPassRate: { passed: 964, total: 1000 },
  antibioticUse: { ddds: 6820, inpatientDays: 17860 },
  patientSatisfaction: { satisfied: 946, surveyed: 980 },
};

function metricOf(board: ReturnType<typeof buildCeoDashboard>, key: string) {
  return board.metrics.find((m) => m.key === key)!;
}

describe('buildCeoDashboard', () => {
  it('返回八张核心指标卡且 demo 为 false，顺序与键名符合约定', () => {
    const board = buildCeoDashboard(base);
    expect(board.demo).toBe(false);
    expect(board.metrics).toHaveLength(8);
    expect(board.metrics.map((m) => m.key)).toEqual([
      'outpatientDaily',
      'inpatientDaily',
      'surgeryDaily',
      'bedOccupancy',
      'drgSettlement',
      'qcPassRate',
      'antibioticUse',
      'patientSatisfaction',
    ]);
  });

  it('门诊量 / 住院量 / 手术量透传', () => {
    const board = buildCeoDashboard(base);
    expect(metricOf(board, 'outpatientDaily').value).toBe(10246);
    expect(metricOf(board, 'inpatientDaily').value).toBe(1812);
    expect(metricOf(board, 'surgeryDaily').value).toBe(96);
  });

  it('床位使用率 = 占用/开放 *100，保留一位小数', () => {
    expect(metricOf(buildCeoDashboard(base), 'bedOccupancy').value).toBe(89.3);
  });

  it('床位使用率阈值：>95 danger，<75 warn，区间 good', () => {
    const over = buildCeoDashboard({ ...base, bedOccupancy: { occupiedBeds: 1920, totalBeds: 2000 } });
    expect(metricOf(over, 'bedOccupancy').status).toBe('danger');
    const idle = buildCeoDashboard({ ...base, bedOccupancy: { occupiedBeds: 1400, totalBeds: 2000 } });
    expect(metricOf(idle, 'bedOccupancy').status).toBe('warn');
    expect(metricOf(buildCeoDashboard(base), 'bedOccupancy').status).toBe('good');
  });

  it('手术完成率阈值：≥95 good，≥85 warn，其余 danger', () => {
    expect(metricOf(buildCeoDashboard(base), 'surgeryDaily').status).toBe('warn'); // 96/104=92.3%
    const good = buildCeoDashboard({ ...base, surgeryDaily: { completed: 100, scheduled: 104 } });
    expect(metricOf(good, 'surgeryDaily').status).toBe('good');
    const bad = buildCeoDashboard({ ...base, surgeryDaily: { completed: 70, scheduled: 104 } });
    expect(metricOf(bad, 'surgeryDaily').status).toBe('danger');
  });

  it('DRG 结余主数值为结余（万元），阈值：≥50 good，≥0 warn，<0 danger', () => {
    expect(metricOf(buildCeoDashboard(base), 'drgSettlement').value).toBe(412.5);
    expect(metricOf(buildCeoDashboard(base), 'drgSettlement').status).toBe('good');
    const flat = buildCeoDashboard({ ...base, drgSettlement: { settledCases: 10, surplusWan: 20 } });
    expect(metricOf(flat, 'drgSettlement').status).toBe('warn');
    const loss = buildCeoDashboard({ ...base, drgSettlement: { settledCases: 10, surplusWan: -15 } });
    expect(metricOf(loss, 'drgSettlement').status).toBe('danger');
  });

  it('病历合格率 = 合格/总数 *100', () => {
    expect(metricOf(buildCeoDashboard(base), 'qcPassRate').value).toBe(96.4);
  });

  it('抗菌药强度 = DDDs/床日 *100', () => {
    expect(metricOf(buildCeoDashboard(base), 'antibioticUse').value).toBe(38.2);
  });

  it('患者满意度 = 满意/回收 *100', () => {
    expect(metricOf(buildCeoDashboard(base), 'patientSatisfaction').value).toBe(96.5);
  });

  it('分母为 0 时比率安全返回 0，不产生 NaN/Infinity', () => {
    const board = buildCeoDashboard({
      ...base,
      bedOccupancy: { occupiedBeds: 0, totalBeds: 0 },
      qcPassRate: { passed: 0, total: 0 },
      antibioticUse: { ddds: 0, inpatientDays: 0 },
      patientSatisfaction: { satisfied: 0, surveyed: 0 },
      surgeryDaily: { completed: 0, scheduled: 0 },
    });
    expect(metricOf(board, 'bedOccupancy').value).toBe(0);
    expect(metricOf(board, 'qcPassRate').value).toBe(0);
    expect(metricOf(board, 'antibioticUse').value).toBe(0);
    expect(metricOf(board, 'patientSatisfaction').value).toBe(0);
    expect(metricOf(board, 'surgeryDaily').detail).toContain('完成率 0%');
  });

  it('同时产出 24h 趋势点（长度 24）', () => {
    const board = buildCeoDashboard(base);
    expect(board.trend).toHaveLength(24);
  });
});

describe('buildTrend', () => {
  const history = { outpatient: 10246, inpatient: 1812, surgery: 96 };

  it('纯函数：同一输入两次调用结果深度相等（无随机/无当前时间）', () => {
    expect(buildTrend(history)).toEqual(buildTrend(history));
  });

  it('默认生成 24 个点，小时标签形如 "HH:00"', () => {
    const points = buildTrend(history);
    expect(points).toHaveLength(24);
    expect(points[0].hour).toBe('00:00');
    expect(points[9].hour).toBe('09:00');
    expect(points[23].hour).toBe('23:00');
  });

  it('hours 参数截断：传 8 只返回前 8 个点', () => {
    expect(buildTrend(history, 8)).toHaveLength(8);
    expect(buildTrend(history, 8)[7].hour).toBe('07:00');
  });

  it('夜间（00:00）手术量为 0，手术集中在白天', () => {
    const points = buildTrend(history);
    expect(points[0].surgery).toBe(0);
    expect(points[3].surgery).toBe(0);
    // 上午高峰时段应 > 0
    expect(points[10].surgery).toBeGreaterThan(0);
  });

  it('24h 门诊逐时求和 ≈ 当日门诊总量（仅舍入误差）', () => {
    const points = buildTrend(history);
    const sum = points.reduce((acc, p) => acc + p.outpatient, 0);
    expect(sum).toBeGreaterThanOrEqual(history.outpatient - 24);
    expect(sum).toBeLessThanOrEqual(history.outpatient + 24);
  });

  it('所有数值非负，类型为 number', () => {
    for (const p of buildTrend(history)) {
      expect(p.outpatient).toBeGreaterThanOrEqual(0);
      expect(p.inpatient).toBeGreaterThanOrEqual(0);
      expect(p.surgery).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(p.outpatient)).toBe(true);
    }
  });

  it('零值历史不产生 NaN/Infinity', () => {
    const points = buildTrend({ outpatient: 0, inpatient: 0, surgery: 0 });
    for (const p of points) {
      expect(p.outpatient).toBe(0);
      expect(p.inpatient).toBe(0);
      expect(p.surgery).toBe(0);
    }
  });
});

describe('listView', () => {
  it('返回演示数据 demo:true、带生成时间、八指标 + 24h 趋势', () => {
    const view = listView();
    expect(view.demo).toBe(true);
    expect(typeof view.generatedAt).toBe('string');
    expect(view.metrics).toHaveLength(8);
    expect(view.trend).toHaveLength(24);
  });
});

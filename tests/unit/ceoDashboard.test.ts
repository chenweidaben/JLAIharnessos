/**
 * 健澜科技 jlmedaios - 院长数据驾驶舱纯函数测试（院长版）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildCeoDashboard,
  listView,
  type CeoDashboardInput,
} from '../../src/bff/aggregators/ceoDashboardAggregator.js';

const base: CeoDashboardInput = {
  bedOccupancy: { occupiedBeds: 1786, totalBeds: 2000 },
  outpatientDaily: { visits: 10246 },
  inpatientDaily: { current: 1812, admitted: 132, discharged: 118 },
  drgSettlement: { settledCases: 86, settledAmountWan: 412.5 },
  qcPassRate: { passed: 964, total: 1000 },
  antibioticUse: { ddds: 6820, inpatientDays: 17860 },
};

function metricOf(board: ReturnType<typeof buildCeoDashboard>, key: string) {
  return board.metrics.find((m) => m.key === key)!;
}

describe('buildCeoDashboard', () => {
  it('返回六张核心指标卡且 demo 为 false', () => {
    const board = buildCeoDashboard(base);
    expect(board.demo).toBe(false);
    expect(board.metrics).toHaveLength(6);
    expect(board.metrics.map((m) => m.key)).toEqual([
      'bedOccupancy',
      'outpatientDaily',
      'inpatientDaily',
      'drgSettlement',
      'qcPassRate',
      'antibioticUse',
    ]);
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

  it('日门诊 / 日住院 / DRG 结算透传', () => {
    const board = buildCeoDashboard(base);
    expect(metricOf(board, 'outpatientDaily').value).toBe(10246);
    expect(metricOf(board, 'inpatientDaily').value).toBe(1812);
    expect(metricOf(board, 'drgSettlement').value).toBe(86);
  });

  it('质控通过率 = 合格/总数 *100', () => {
    expect(metricOf(buildCeoDashboard(base), 'qcPassRate').value).toBe(96.4);
  });

  it('质控通过率阈值：≥95 good，≥90 warn，其余 danger', () => {
    const warn = buildCeoDashboard({ ...base, qcPassRate: { passed: 920, total: 1000 } });
    expect(metricOf(warn, 'qcPassRate').status).toBe('warn');
    const bad = buildCeoDashboard({ ...base, qcPassRate: { passed: 850, total: 1000 } });
    expect(metricOf(bad, 'qcPassRate').status).toBe('danger');
  });

  it('抗菌药强度 = DDDs/床日 *100', () => {
    expect(metricOf(buildCeoDashboard(base), 'antibioticUse').value).toBe(38.2);
  });

  it('抗菌药强度阈值：≤40 good，≤50 warn，>50 danger', () => {
    const warn = buildCeoDashboard({ ...base, antibioticUse: { ddds: 8500, inpatientDays: 17860 } });
    expect(metricOf(warn, 'antibioticUse').status).toBe('warn');
    const bad = buildCeoDashboard({ ...base, antibioticUse: { ddds: 10000, inpatientDays: 17860 } });
    expect(metricOf(bad, 'antibioticUse').status).toBe('danger');
  });

  it('分母为 0 时比率安全返回 0，不产生 NaN/Infinity', () => {
    const board = buildCeoDashboard({
      ...base,
      bedOccupancy: { occupiedBeds: 0, totalBeds: 0 },
      qcPassRate: { passed: 0, total: 0 },
      antibioticUse: { ddds: 0, inpatientDays: 0 },
    });
    expect(metricOf(board, 'bedOccupancy').value).toBe(0);
    expect(metricOf(board, 'qcPassRate').value).toBe(0);
    expect(metricOf(board, 'antibioticUse').value).toBe(0);
  });
});

describe('listView', () => {
  it('返回演示数据 demo:true 且带生成时间', () => {
    const view = listView();
    expect(view.demo).toBe(true);
    expect(typeof view.generatedAt).toBe('string');
    expect(view.metrics).toHaveLength(6);
  });
});

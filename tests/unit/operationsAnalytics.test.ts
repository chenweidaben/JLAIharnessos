/**
 * 健澜科技 jlmedaios - 运营数据分析纯函数单测（M189-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzeInpatientTrend,
  analyzeOutpatientTrend,
  buildOperationsAnalyticsReport,
  type InpatientData,
  type OutpatientData,
} from '../../src/bff/aggregators/operationsAnalyticsAggregator';

describe('analyzeOutpatientTrend', () => {
  it('门诊量上升趋势', () => {
    const data: OutpatientData = {
      visits: [2000, 2100, 2200, 2300, 2400, 2500, 2600],
      appointmentRate: 0.8,
      waitingTime: 15,
      satisfaction: 0.9,
    };
    const r = analyzeOutpatientTrend(data);
    expect(r.trend).toBe('up');
  });

  it('门诊量下降趋势', () => {
    const data: OutpatientData = {
      visits: [3000, 2900, 2800, 2700, 2600, 2500, 2400],
      appointmentRate: 0.8,
      waitingTime: 15,
      satisfaction: 0.9,
    };
    const r = analyzeOutpatientTrend(data);
    expect(r.trend).toBe('down');
  });

  it('平均门诊量计算', () => {
    const data: OutpatientData = {
      visits: [1000, 2000, 3000],
      appointmentRate: 0.8,
      waitingTime: 15,
      satisfaction: 0.9,
    };
    const r = analyzeOutpatientTrend(data);
    expect(r.avgVisits).toBe(2000);
  });
});

describe('analyzeInpatientTrend', () => {
  it('返回床位使用率/周转/住院日', () => {
    const data: InpatientData = {
      discharges: 800,
      averageLOS: 8,
      bedOccupancy: 0.85,
      turnover: 30,
    };
    const r = analyzeInpatientTrend(data);
    expect(r.bedOccupancy).toBe(85);
    expect(r.turnover).toBe(30);
    expect(r.los).toBe(8);
  });
});

describe('buildOperationsAnalyticsReport', () => {
  it('生成门诊数据', () => {
    const r = buildOperationsAnalyticsReport('30d');
    expect(r.outpatient.visits.length).toBeGreaterThan(0);
  });

  it('生成住院数据', () => {
    const r = buildOperationsAnalyticsReport('30d');
    expect(r.inpatient.discharges).toBeGreaterThan(0);
  });

  it('生成收支结余', () => {
    const r = buildOperationsAnalyticsReport('30d');
    expect(r.balance).toBeGreaterThan(0);
  });

  it('生成趋势分析', () => {
    const r = buildOperationsAnalyticsReport('30d');
    expect(r.outpatientTrend.trend).toBeDefined();
  });

  it('生成优化建议', () => {
    const r = buildOperationsAnalyticsReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

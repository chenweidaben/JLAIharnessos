/**
 * 健澜AI原生医院操作系统OS - P5-1 医疗质量指标 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  METRIC_WHITELIST, __resetStore, byDoctor, computeOverview, seed, trend,
} from '../../src/bff/aggregators/qualityDashboardAggregator';

beforeEach(() => { __resetStore(); });

describe('P5-1 空库指标', () => {
  test('空库 → 全部指标 0', () => {
    const o = computeOverview();
    expect(o.cdsHardStopRate).toBe(0);
    expect(o.fallRatePer1000).toBe(0);
    expect(o.patientSatisfactionAvg).toBe(0);
  });
  test('空库 by-doctor → 空数组', () => {
    expect(byDoctor()).toEqual([]);
  });
});

describe('P5-1 种子后指标', () => {
  beforeEach(() => seed());

  test('9 项指标字段齐全', () => {
    const o = computeOverview();
    const keys = Object.keys(o).sort();
    expect(keys).toEqual([
      'cdsHardStopRate', 'cdsOverrideRate',
      'chiefRoundCompletionRate',
      'criticalValueAvgAckMin', 'criticalValueClosedLoopRate',
      'fallRatePer1000', 'lowScoreTicketClosedRate',
      'orderExecutionMedianMin', 'patientSatisfactionAvg',
      'pressureUlcerRatePer1000',
    ].sort());
  });
  test('CDS hard-stop 率非零', () => {
    expect(computeOverview().cdsHardStopRate).toBeGreaterThan(0);
  });
  test('fallRatePer1000 非零', () => {
    expect(computeOverview().fallRatePer1000).toBeGreaterThan(0);
  });
  test('满意度均分在 3-5 之间', () => {
    const v = computeOverview().patientSatisfactionAvg;
    expect(v).toBeGreaterThanOrEqual(3);
    expect(v).toBeLessThanOrEqual(5);
  });
  test('危急值闭环率在 0-1 之间', () => {
    const v = computeOverview().criticalValueClosedLoopRate;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
  test('科室过滤后指标仍非零', () => {
    expect(computeOverview('DEPT-INT').cdsHardStopRate).toBeGreaterThan(0);
  });
  test('by-doctor 返回非空且含 cdsTotal', () => {
    const rows = byDoctor();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].cdsTotal).toBeGreaterThan(0);
  });
  test('by-doctor 科室过滤', () => {
    const rows = byDoctor('DEPT-INT');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.departmentId).toBe('DEPT-INT');
  });
});

describe('P5-1 trend', () => {
  beforeEach(() => seed());

  test('合法 metric → 日序列非空', () => {
    const pts = trend('cdsHardStopRate');
    expect(pts.length).toBeGreaterThan(0);
    expect(pts[0]).toHaveProperty('date');
    expect(pts[0]).toHaveProperty('value');
  });
  test('metric 白名单长度 10', () => {
    expect(METRIC_WHITELIST.length).toBe(10);
  });
  test('trend 按日期升序', () => {
    const pts = trend('fallRatePer1000');
    for (let i = 1; i < pts.length; i++) expect(pts[i].date >= pts[i-1].date).toBe(true);
  });
});

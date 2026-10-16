/**
 * 健澜科技 jlmedaios - 绩效管理 V2 纯函数单测（M226-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPerformanceMgmtReportV2,
  calculatePerformanceScore,
  distributePerformanceBonus,
} from '../../src/bff/aggregators/performanceMgmtReportV2Aggregator';

describe('calculatePerformanceScore', () => {
  it('指标[90,80] 权重[0.6,0.4] → 86分 B级', () => {
    const r = calculatePerformanceScore([90, 80], [0.6, 0.4]);
    expect(r.score).toBe(86);
    expect(r.grade).toBe('B');
  });

  it('指标[95,90] 权重[0.6,0.4] → 93分 A级', () => {
    expect(calculatePerformanceScore([95, 90], [0.6, 0.4]).grade).toBe('A');
  });
});

describe('distributePerformanceBonus', () => {
  it('总额10万 得分[3,7] → [3万,7万]', () => {
    const r = distributePerformanceBonus(100000, [3, 7]);
    expect(r.distributed[0]).toBe(30000);
    expect(r.distributed[1]).toBe(70000);
  });
});

describe('buildPerformanceMgmtReportV2', () => {
  it('生成院级数据', () => {
    const r = buildPerformanceMgmtReportV2('30d');
    expect(r.hospital.depts).toBeGreaterThan(0);
  });

  it('生成个人数据', () => {
    const r = buildPerformanceMgmtReportV2('30d');
    expect(r.individual.total).toBeGreaterThan(0);
  });

  it('生成奖金数据', () => {
    const r = buildPerformanceMgmtReportV2('30d');
    expect(r.distribution.bonus).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPerformanceMgmtReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

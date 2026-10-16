/**
 * 健澜科技 jlmedaios - 住院管理 V2 纯函数单测（M225-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessBedUtilization,
  buildInpatientReportV2,
  calculateLOS,
} from '../../src/bff/aggregators/inpatientReportV2Aggregator';

describe('assessBedUtilization', () => {
  it('1200床 1100占用 → 91.7% 合理', () => {
    const r = assessBedUtilization(1200, 1100);
    expect(r.rate).toBe(91.7);
  });

  it('1200床 1300占用 → 108.3% 超负荷', () => {
    expect(assessBedUtilization(1200, 1300).level).toBe('超负荷');
  });
});

describe('calculateLOS', () => {
  it('入院第1天 出院第8天 → 7天 正常', () => {
    const r = calculateLOS(1, 8);
    expect(r.days).toBe(7);
    expect(r.normal).toBe(true);
  });
});

describe('buildInpatientReportV2', () => {
  it('生成入院数据', () => {
    const r = buildInpatientReportV2('30d');
    expect(r.admission.registered).toBeGreaterThan(0);
  });

  it('生成床位数据', () => {
    const r = buildInpatientReportV2('30d');
    expect(r.bed.total).toBeGreaterThan(0);
  });

  it('生成费用数据', () => {
    const r = buildInpatientReportV2('30d');
    expect(r.cost.average).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInpatientReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

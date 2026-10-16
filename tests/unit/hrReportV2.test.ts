/**
 * 健澜科技 jlmedaios - 人力资源 V2 纯函数单测（M211-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessStaffingRatio,
  buildHRReportV2,
  calculateTurnoverRate,
} from '../../src/bff/aggregators/hrReportV2Aggregator';

describe('calculateTurnoverRate', () => {
  it('2000 人离职 30 → 1.5% 稳定', () => {
    const r = calculateTurnoverRate(2000, 30);
    expect(r.rate).toBe(0.015);
    expect(r.level).toBe('稳定');
  });

  it('2000 人离职 300 → 15% 偏高', () => {
    const r = calculateTurnoverRate(2000, 300);
    expect(r.level).toBe('偏高');
  });
});

describe('assessStaffingRatio', () => {
  it('医生 500 护士 1200 床位 1000 → 床护比 1.2 充足', () => {
    const r = assessStaffingRatio(500, 1200, 1000);
    expect(r.nurseBedRatio).toBe(1.2);
    expect(r.adequate).toBe(true);
  });

  it('医生 500 护士 300 床位 1000 → 床护比 0.3 不足', () => {
    const r = assessStaffingRatio(500, 300, 1000);
    expect(r.adequate).toBe(false);
  });
});

describe('buildHRReportV2', () => {
  it('生成人事数据', () => {
    const r = buildHRReportV2('30d');
    expect(r.personnel.total).toBeGreaterThan(0);
  });

  it('生成薪酬数据', () => {
    const r = buildHRReportV2('30d');
    expect(r.compensation.avgSalary).toBeGreaterThan(0);
  });

  it('生成编制数据', () => {
    const r = buildHRReportV2('30d');
    expect(r.establishment.approved).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildHRReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 手术 V3 纯函数单测（M204-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessSurgeryRisk,
  buildSurgeryReportV3,
  calculateORUtilization,
} from '../../src/bff/aggregators/surgeryReportV3Aggregator';

describe('assessSurgeryRisk', () => {
  it('ASA 4 + 四级手术 → 高风险', () => {
    const r = assessSurgeryRisk(4, 4);
    expect(r.risk).toBe('高风险');
  });

  it('ASA 1 + 一级手术 → 低风险', () => {
    const r = assessSurgeryRisk(1, 1);
    expect(r.risk).toBe('低风险');
  });
});

describe('calculateORUtilization', () => {
  it('85% → efficient', () => {
    const r = calculateORUtilization(100, 85);
    expect(r.utilization).toBe(0.85);
    expect(r.efficient).toBe(true);
  });

  it('60% → 低效', () => {
    const r = calculateORUtilization(100, 60);
    expect(r.efficient).toBe(false);
  });
});

describe('buildSurgeryReportV3', () => {
  it('生成排程数据', () => {
    const r = buildSurgeryReportV3('30d');
    expect(r.scheduling.totalSlots).toBeGreaterThan(0);
  });

  it('生成分级数据', () => {
    const r = buildSurgeryReportV3('30d');
    expect(r.grading.level3).toBeGreaterThan(0);
  });

  it('生成质量数据', () => {
    const r = buildSurgeryReportV3('30d');
    expect(r.quality.ssiRate).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildSurgeryReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - EMR 评级纯函数单测（M210-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessEMRLevel,
  buildEMRGapAnalysis,
  buildEMRRatingReport,
  type EMRFeatures,
} from '../../src/bff/aggregators/emrRatingReportAggregator';

describe('assessEMRLevel', () => {
  it('CDR 具备 → 5 级', () => {
    const f: EMRFeatures = { dataCollection: true, cdr: true, closedLoopCDSS: false, paperless: false, aiAdvanced: false };
    const r = assessEMRLevel(f);
    expect(r.level).toBe(5);
  });

  it('AI 高级 → 8 级', () => {
    const f: EMRFeatures = { dataCollection: true, cdr: true, closedLoopCDSS: true, paperless: true, aiAdvanced: true };
    const r = assessEMRLevel(f);
    expect(r.level).toBe(8);
  });
});

describe('buildEMRGapAnalysis', () => {
  it('5 → 6 级差距 1', () => {
    const r = buildEMRGapAnalysis(5, 6);
    expect(r.gap).toBe(1);
  });

  it('5 → 7 级差距 2 含建设 CDR', () => {
    const r = buildEMRGapAnalysis(5, 7);
    expect(r.gap).toBe(2);
    expect(r.actions).toContain('建设 CDR');
  });
});

describe('buildEMRRatingReport', () => {
  it('生成当前等级', () => {
    const r = buildEMRRatingReport('30d');
    expect(r.current).toBeGreaterThanOrEqual(0);
  });

  it('生成特征数据', () => {
    const r = buildEMRRatingReport('30d');
    expect(r.features.cdr).toBe(true);
  });

  it('生成差距分析', () => {
    const r = buildEMRRatingReport('30d');
    expect(r.gapAnalysis.gap).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildEMRRatingReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

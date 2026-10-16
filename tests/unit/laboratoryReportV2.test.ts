/**
 * 健澜科技 jlmedaios - 检验中心 V2 纯函数单测（M223-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessLabQuality,
  buildLaboratoryReportV2,
  handleCriticalValue,
} from '../../src/bff/aggregators/laboratoryReportV2Aggregator';

describe('assessLabQuality', () => {
  it('QC95 EQA95 → 优秀', () => {
    expect(assessLabQuality(95, 95).level).toBe('优秀');
  });

  it('QC70 EQA70 → 不合格', () => {
    expect(assessLabQuality(70, 70).pass).toBe(false);
  });
});

describe('handleCriticalValue', () => {
  it('结果2 阈值3-100 → 危急', () => {
    expect(handleCriticalValue(2, { low: 3, high: 100 }).critical).toBe(true);
  });

  it('结果50 阈值3-100 → 常规', () => {
    expect(handleCriticalValue(50, { low: 3, high: 100 }).critical).toBe(false);
  });
});

describe('buildLaboratoryReportV2', () => {
  it('生成检验数据', () => {
    const r = buildLaboratoryReportV2('30d');
    expect(r.analytic.tests).toBeGreaterThan(0);
  });

  it('生成急诊数据', () => {
    const r = buildLaboratoryReportV2('30d');
    expect(r.emergency.stat).toBeGreaterThan(0);
  });

  it('生成分子诊断数据', () => {
    const r = buildLaboratoryReportV2('30d');
    expect(r.molecular.pcr).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildLaboratoryReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

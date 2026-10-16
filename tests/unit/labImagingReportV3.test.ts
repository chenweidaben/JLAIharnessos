/**
 * 健澜科技 jlmedaios - 检验检查 V3 纯函数单测（M204-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessLabQuality,
  buildLabImagingReportV3,
  classifyCriticalValue,
} from '../../src/bff/aggregators/labImagingReportV3Aggregator';

describe('assessLabQuality', () => {
  it('QC 99% + EQA 98% → 优秀', () => {
    const r = assessLabQuality(0.99, 0.98);
    expect(r.level).toBe('优秀');
    expect(r.pass).toBe(true);
  });

  it('QC 90% → 不合格', () => {
    const r = assessLabQuality(0.9, 0.95);
    expect(r.pass).toBe(false);
  });
});

describe('classifyCriticalValue', () => {
  it('结果 10（参考 4-10，下限 4*0.5=2）→ 正常', () => {
    const r = classifyCriticalValue(5, 4, 10);
    expect(r.critical).toBe(false);
  });

  it('结果 30（参考 4-10，10*2=20）→ 危急值', () => {
    const r = classifyCriticalValue(30, 4, 10);
    expect(r.critical).toBe(true);
  });
});

describe('buildLabImagingReportV3', () => {
  it('生成检验前数据', () => {
    const r = buildLabImagingReportV3('30d');
    expect(r.preAnalytic.orders).toBeGreaterThan(0);
  });

  it('生成影像数据', () => {
    const r = buildLabImagingReportV3('30d');
    expect(r.imaging.ct).toBeGreaterThan(0);
  });

  it('生成危急值数据', () => {
    const r = buildLabImagingReportV3('30d');
    expect(r.criticalValue.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildLabImagingReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

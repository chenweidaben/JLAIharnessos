/**
 * 健澜科技 jlmedaios - 影像中心 V2 纯函数单测（M223-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessImageQuality,
  buildImagingReportV2,
  structureReport,
} from '../../src/bff/aggregators/imagingReportV2Aggregator';

describe('assessImageQuality', () => {
  it('1000影像 960合格 → 96% 通过', () => {
    expect(assessImageQuality(1000, 960).pass).toBe(true);
  });

  it('1000影像 900合格 → 90% 不通过', () => {
    expect(assessImageQuality(1000, 900).pass).toBe(false);
  });
});

describe('structureReport', () => {
  it('3个发现 → 4节 就绪', () => {
    const r = structureReport('模板', ['发现1', '发现2', '发现3']);
    expect(r.sections).toBe(4);
    expect(r.ready).toBe(true);
  });
});

describe('buildImagingReportV2', () => {
  it('生成DR数据', () => {
    const r = buildImagingReportV2('30d');
    expect(r.xray.dr).toBeGreaterThan(0);
  });

  it('生成CT数据', () => {
    const r = buildImagingReportV2('30d');
    expect(r.ct.ct).toBeGreaterThan(0);
  });

  it('生成核医学数据', () => {
    const r = buildImagingReportV2('30d');
    expect(r.nuclear.pet).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildImagingReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

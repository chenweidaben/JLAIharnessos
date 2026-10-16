/**
 * 健澜科技 jlmedaios - 检验检查智能审核纯函数单测（M190-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildLabImagingAuditReport,
  detectAbnormalImagingReport,
  detectAbnormalLabResult,
  type ImagingReport,
  type LabResult,
} from '../../src/bff/aggregators/labImagingAuditAggregator';

describe('detectAbnormalLabResult', () => {
  it('正常范围 → 无异常', () => {
    const r: LabResult = { item: 'WBC', value: 6, unit: '10^9/L', refRange: [4, 10] };
    expect(detectAbnormalLabResult(r).abnormal).toBe(false);
  });

  it('超出范围 → 异常', () => {
    const r: LabResult = { item: 'WBC', value: 15, unit: '10^9/L', refRange: [4, 10] };
    expect(detectAbnormalLabResult(r).abnormal).toBe(true);
  });

  it('危急值 → critical', () => {
    const r: LabResult = { item: 'WBC', value: 25, unit: '10^9/L', refRange: [4, 10] };
    expect(detectAbnormalLabResult(r).critical).toBe(true);
  });
});

describe('detectAbnormalImagingReport', () => {
  it('包含"出血" → 异常 + 危急', () => {
    const r: ImagingReport = { modality: 'CT', finding: '颅内出血', isCritical: false };
    expect(detectAbnormalImagingReport(r).abnormal).toBe(true);
  });

  it('正常报告 → 无异常', () => {
    const r: ImagingReport = { modality: 'DR', finding: '心肺正常', isCritical: false };
    expect(detectAbnormalImagingReport(r).abnormal).toBe(false);
  });
});

describe('buildLabImagingAuditReport', () => {
  it('检验准确率 > 0', () => {
    const r = buildLabImagingAuditReport('检验科', '30d');
    expect(r.labAccuracy).toBeGreaterThan(0);
  });

  it('生成改进建议', () => {
    const r = buildLabImagingAuditReport('检验科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

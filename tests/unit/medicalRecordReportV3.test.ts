/**
 * 健澜科技 jlmedaios - 病案 V3 纯函数单测（M205-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessMRQuality,
  buildMedicalRecordReportV3,
  validateICDCoding,
} from '../../src/bff/aggregators/medicalRecordReportV3Aggregator';

describe('assessMRQuality', () => {
  it('甲级 + 0 缺陷 → 甲级通过', () => {
    const r = assessMRQuality(1, 0);
    expect(r.level).toBe('甲级');
    expect(r.pass).toBe(true);
  });

  it('丙级 + 多缺陷 → 丙级不通过', () => {
    const r = assessMRQuality(3, 10);
    expect(r.pass).toBe(false);
  });
});

describe('validateICDCoding', () => {
  it('正确编码 → valid', () => {
    const r = validateICDCoding('I10', 'I10');
    expect(r.valid).toBe(true);
  });

  it('错误编码 → 有问题', () => {
    const r = validateICDCoding('X1', '');
    expect(r.valid).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});

describe('buildMedicalRecordReportV3', () => {
  it('生成回收数据', () => {
    const r = buildMedicalRecordReportV3('30d');
    expect(r.retrieval.total).toBeGreaterThan(0);
  });

  it('生成编码数据', () => {
    const r = buildMedicalRecordReportV3('30d');
    expect(r.coding.icd10Accuracy).toBeGreaterThan(0);
  });

  it('生成DRG数据', () => {
    const r = buildMedicalRecordReportV3('30d');
    expect(r.drgDip.groupingRate).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMedicalRecordReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

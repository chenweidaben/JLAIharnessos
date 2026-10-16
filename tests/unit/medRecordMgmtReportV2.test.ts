/**
 * 健澜科技 jlmedaios - 病案管理 V2 纯函数单测（M225-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessCodingAccuracy,
  buildMedRecordMgmtReportV2,
  calculateRecordGrade,
} from '../../src/bff/aggregators/medRecordMgmtReportV2Aggregator';

describe('assessCodingAccuracy', () => {
  it('8000编码 7800正确 → 97.5% 合格', () => {
    expect(assessCodingAccuracy(8000, 7800).qualified).toBe(true);
  });

  it('8000编码 7500正确 → 93.8% 不合格', () => {
    expect(assessCodingAccuracy(8000, 7500).qualified).toBe(false);
  });
});

describe('calculateRecordGrade', () => {
  it('8000病案 400缺陷 → 95% 甲级', () => {
    expect(calculateRecordGrade(8000, 400).grade).toBe('甲级');
  });

  it('8000病案 1000缺陷 → 87.5% 丙级', () => {
    expect(calculateRecordGrade(8000, 1000).grade).toBe('丙级');
  });
});

describe('buildMedRecordMgmtReportV2', () => {
  it('生成回收数据', () => {
    const r = buildMedRecordMgmtReportV2('30d');
    expect(r.retrieval.collected).toBeGreaterThan(0);
  });

  it('生成编码数据', () => {
    const r = buildMedRecordMgmtReportV2('30d');
    expect(r.coding.icd10).toBeGreaterThan(0);
  });

  it('生成质控数据', () => {
    const r = buildMedRecordMgmtReportV2('30d');
    expect(r.quality.gradeA).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMedRecordMgmtReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

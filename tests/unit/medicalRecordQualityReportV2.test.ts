/**
 * 健澜科技 jlmedaios - 病历质量 V2 纯函数单测（M209-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessRecordQuality,
  buildMedicalRecordQualityReportV2,
  validateHomePageData,
  type RecordDefects,
  type HomepageData,
} from '../../src/bff/aggregators/medicalRecordQualityReportV2Aggregator';

describe('assessRecordQuality', () => {
  it('缺陷 1 → 甲级', () => {
    const d: RecordDefects = { runtime: 1, terminal: 0, consent: 0, signature: 0 };
    const r = assessRecordQuality(d);
    expect(r.grade).toBe('甲级');
  });

  it('缺陷 10 → 丙级', () => {
    const d: RecordDefects = { runtime: 4, terminal: 3, consent: 2, signature: 1 };
    const r = assessRecordQuality(d);
    expect(r.grade).toBe('丙级');
  });
});

describe('validateHomePageData', () => {
  it('完整 → valid', () => {
    const h: HomepageData = { mainDiagnosis: '肺炎', mainProcedure: '无', totalCost: 5000 };
    const r = validateHomePageData(h);
    expect(r.valid).toBe(true);
  });

  it('缺主诊断 → invalid', () => {
    const h: HomepageData = { mainDiagnosis: '', mainProcedure: '无', totalCost: 5000 };
    const r = validateHomePageData(h);
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('主诊断');
  });
});

describe('buildMedicalRecordQualityReportV2', () => {
  it('生成运行数据', () => {
    const r = buildMedicalRecordQualityReportV2('30d');
    expect(r.runtime.onTime).toBeGreaterThan(0);
  });

  it('生成终末数据', () => {
    const r = buildMedicalRecordQualityReportV2('30d');
    expect(r.terminal.gradeA).toBeGreaterThan(0);
  });

  it('生成EMR评级', () => {
    const r = buildMedicalRecordQualityReportV2('30d');
    expect(r.emrRating.level).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildMedicalRecordQualityReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

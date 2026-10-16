/**
 * 健澜科技 jlmedaios - 健康管理 V2 纯函数单测（M222-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessHealthRisk,
  buildHealthManagementReportV2,
  trackChronicDiseaseControl,
} from '../../src/bff/aggregators/healthManagementReportV2Aggregator';

describe('assessHealthRisk', () => {
  it('问卷40 体征2 → 60分 高风险', () => {
    expect(assessHealthRisk(40, 2).high).toBe(true);
  });

  it('问卷20 体征1 → 30分 中风险', () => {
    expect(assessHealthRisk(20, 1).level).toBe('中风险');
  });
});

describe('trackChronicDiseaseControl', () => {
  it('1000患者 700达标 → 70% 控制', () => {
    expect(trackChronicDiseaseControl(1000, 700).controlled).toBe(true);
  });

  it('1000患者 500达标 → 50% 未控制', () => {
    expect(trackChronicDiseaseControl(1000, 500).controlled).toBe(false);
  });
});

describe('buildHealthManagementReportV2', () => {
  it('生成体检数据', () => {
    const r = buildHealthManagementReportV2('30d');
    expect(r.screening.exams).toBeGreaterThan(0);
  });

  it('生成慢病数据', () => {
    const r = buildHealthManagementReportV2('30d');
    expect(r.chronic.hypertension).toBeGreaterThan(0);
  });

  it('生成档案数据', () => {
    const r = buildHealthManagementReportV2('30d');
    expect(r.records.ehr).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildHealthManagementReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

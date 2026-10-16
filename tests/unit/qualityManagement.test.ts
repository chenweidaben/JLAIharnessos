/**
 * 健澜科技 jlmedaios - 质量管理纯函数单测（M189-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildQualityManagementReport,
  generatePDCAImprovement,
  scoreMedicalQuality,
  type MedicalQualityData,
} from '../../src/bff/aggregators/qualityManagementAggregator';

describe('scoreMedicalQuality', () => {
  it('各项平均 = 得分', () => {
    const data: MedicalQualityData = {
      cureRate: 0.9,
      improvementRate: 0.9,
      criticalSuccessRate: 0.9,
      gradeAChartRate: 0.9,
    };
    expect(scoreMedicalQuality(data)).toBe(90);
  });

  it('得分在 0-100 之间', () => {
    const data: MedicalQualityData = {
      cureRate: 0.5,
      improvementRate: 0.6,
      criticalSuccessRate: 0.7,
      gradeAChartRate: 0.8,
    };
    const score = scoreMedicalQuality(data);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('generatePDCAImprovement', () => {
  it('低分生成完整 PDCA', () => {
    const s = generatePDCAImprovement(70);
    expect(s.length).toBe(4);
    expect(s[0]).toContain('Plan');
  });

  it('高分返回保持建议', () => {
    const s = generatePDCAImprovement(90);
    expect(s[0]).toContain('保持');
  });
});

describe('buildQualityManagementReport', () => {
  it('生成医疗质量得分', () => {
    const r = buildQualityManagementReport('心内科', '30d');
    expect(r.medicalScore).toBeGreaterThan(0);
  });

  it('包含护理质量指标', () => {
    const r = buildQualityManagementReport('心内科', '30d');
    expect(r.nursingQuality.passRate).toBeGreaterThan(0);
  });

  it('包含 PDCA 建议', () => {
    const r = buildQualityManagementReport('心内科', '30d');
    expect(r.pdcaSuggestions.length).toBeGreaterThan(0);
  });
});

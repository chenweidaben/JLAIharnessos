/**
 * 健澜科技 jlmedaios - AI 辅助 V2 纯函数单测（M208-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessAIAdoptionRate,
  buildAIAssistReportV2,
  generateDifferentialDiagnosis,
} from '../../src/bff/aggregators/aiAssistReportV2Aggregator';

describe('assessAIAdoptionRate', () => {
  it('采纳 35000/50000 → 70% 高', () => {
    const r = assessAIAdoptionRate(50000, 35000);
    expect(r.adoptionRate).toBe(0.7);
    expect(r.level).toBe('高');
  });

  it('采纳 10000/50000 → 20% 低', () => {
    const r = assessAIAdoptionRate(50000, 10000);
    expect(r.level).toBe('低');
  });
});

describe('generateDifferentialDiagnosis', () => {
  it('发热+咳嗽 → 肺炎/上感/结核', () => {
    const r = generateDifferentialDiagnosis(['发热', '咳嗽']);
    expect(r.diagnoses.length).toBeGreaterThanOrEqual(3);
    expect(r.top1).toBe('肺炎');
  });

  it('胸痛 → 心梗等', () => {
    const r = generateDifferentialDiagnosis(['胸痛']);
    expect(r.diagnoses).toContain('急性心梗');
  });
});

describe('buildAIAssistReportV2', () => {
  it('生成CDSS数据', () => {
    const r = buildAIAssistReportV2('30d');
    expect(r.cdss.suggestions).toBeGreaterThan(0);
  });

  it('生成用药数据', () => {
    const r = buildAIAssistReportV2('30d');
    expect(r.medication.alerts).toBeGreaterThan(0);
  });

  it('生成预警数据', () => {
    const r = buildAIAssistReportV2('30d');
    expect(r.warning.sepsis).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildAIAssistReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

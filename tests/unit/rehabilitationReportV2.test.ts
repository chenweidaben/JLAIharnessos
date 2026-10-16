/**
 * 健澜科技 jlmedaios - 康复医学 V2 纯函数单测（M222-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessADLIndependence,
  buildRehabilitationReportV2,
  designRehabPlan,
} from '../../src/bff/aggregators/rehabilitationReportV2Aggregator';

describe('assessADLIndependence', () => {
  it('Barthel 95 → 完全独立', () => {
    expect(assessADLIndependence(95).independent).toBe(true);
  });

  it('Barthel 50 → 中度依赖', () => {
    expect(assessADLIndependence(50).level).toBe('中度依赖');
  });
});

describe('designRehabPlan', () => {
  it('卒中 → 8周 3模态', () => {
    const r = designRehabPlan(1, '卒中');
    expect(r.duration).toBe(8);
    expect(r.modalities.length).toBe(3);
  });

  it('骨折 → 4周', () => {
    expect(designRehabPlan(1, '骨折').duration).toBe(4);
  });
});

describe('buildRehabilitationReportV2', () => {
  it('生成评定数据', () => {
    const r = buildRehabilitationReportV2('30d');
    expect(r.assessment.adl).toBeGreaterThan(0);
  });

  it('生成治疗数据', () => {
    const r = buildRehabilitationReportV2('30d');
    expect(r.therapy.pt).toBeGreaterThan(0);
  });

  it('生成专科数据', () => {
    const r = buildRehabilitationReportV2('30d');
    expect(r.specialty.stroke).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildRehabilitationReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

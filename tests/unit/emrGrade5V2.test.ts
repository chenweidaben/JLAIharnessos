/**
 * 健澜科技 jlmedaios - EMR 五级评审 V2 纯函数单测（M187-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildEMRGrade5Assessment,
  DIMENSIONS_V2,
  generateImprovementSuggestions,
  scoreDimension,
  type DimensionKeyV2,
} from '../../src/bff/aggregators/emrGrade5V2Aggregator';

describe('scoreDimension', () => {
  it('平均完成度 × 100 = 得分', () => {
    const score = scoreDimension('medical_quality', { a: 0.9, b: 0.8 });
    expect(score).toBe(85);
  });

  it('空数据返回 0', () => {
    expect(scoreDimension('nursing', {})).toBe(0);
  });
});

describe('generateImprovementSuggestions', () => {
  it('低于80分生成建议', () => {
    const scores: Record<DimensionKeyV2, number> = {
      medical_quality: 90,
      nursing: 85,
      medtech: 70,
      patient_service: 88,
      operation: 75,
      data_quality: 92,
      security: 95,
      interconnect: 80,
    };
    const s = generateImprovementSuggestions(scores);
    expect(s.some((x) => x.includes('医技管理'))).toBe(true);
    expect(s.some((x) => x.includes('运营管理'))).toBe(true);
  });

  it('全部达标返回保持建议', () => {
    const scores: Record<DimensionKeyV2, number> = {
      medical_quality: 90,
      nursing: 85,
      medtech: 85,
      patient_service: 88,
      operation: 85,
      data_quality: 92,
      security: 95,
      interconnect: 80,
    };
    const s = generateImprovementSuggestions(scores);
    expect(s[0]).toContain('保持');
  });
});

describe('buildEMRGrade5Assessment', () => {
  it('包含 8 个维度', () => {
    const r = buildEMRGrade5Assessment('全院', '30d');
    expect(Object.keys(r.scores).length).toBe(DIMENSIONS_V2.length);
  });

  it('总分 = 各维度平均', () => {
    const r = buildEMRGrade5Assessment('全院', '30d');
    const expected = Math.round(
      DIMENSIONS_V2.reduce((sum, d) => sum + r.scores[d.key], 0) / DIMENSIONS_V2.length,
    );
    expect(r.totalScore).toBe(expected);
  });

  it('包含三级医院对标', () => {
    const r = buildEMRGrade5Assessment('全院', '30d');
    expect(r.benchmark.tertiary).toBeGreaterThan(r.benchmark.secondary);
  });
});

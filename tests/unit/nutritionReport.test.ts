/**
 * 健澜科技 jlmedaios - 营养膳食纯函数单测（M220-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildNutritionReport,
  designNutritionPrescription,
  screenNutritionalRisk,
} from '../../src/bff/aggregators/nutritionReportAggregator';

describe('screenNutritionalRisk', () => {
  it('评分5 → 高风险', () => {
    expect(screenNutritionalRisk(5).level).toBe('高风险');
  });

  it('评分3 → 中风险', () => {
    expect(screenNutritionalRisk(3).level).toBe('中风险');
  });

  it('评分1 → 低风险', () => {
    expect(screenNutritionalRisk(1).level).toBe('低风险');
  });
});

describe('designNutritionPrescription', () => {
  it('普通患者 60kg → EN 1500kcal', () => {
    const r = designNutritionPrescription('普通', 60);
    expect(r.route).toBe('EN');
    expect(r.calories).toBe(1500);
  });

  it('重症患者 60kg → PN', () => {
    const r = designNutritionPrescription('重症', 60);
    expect(r.route).toBe('PN');
  });
});

describe('buildNutritionReport', () => {
  it('生成筛查数据', () => {
    const r = buildNutritionReport('30d');
    expect(r.screening.nrs2002).toBeGreaterThan(0);
  });

  it('生成治疗数据', () => {
    const r = buildNutritionReport('30d');
    expect(r.treatment.en).toBeGreaterThan(0);
  });

  it('生成门诊数据', () => {
    const r = buildNutritionReport('30d');
    expect(r.clinic.visits).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildNutritionReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

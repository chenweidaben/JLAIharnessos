/**
 * 健澜科技 jlmedaios - 康复老年纯函数单测（M202-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessRehabilitationEffect,
  buildRehabilitationReport,
  classifyGeriatricSyndrome,
  type GeriatricPatient,
} from '../../src/bff/aggregators/rehabilitationAggregator';

describe('assessRehabilitationEffect', () => {
  it('显著改善 → 有效', () => {
    const r = assessRehabilitationEffect(40, 65);
    expect(r.effective).toBe(true);
    expect(r.improvement).toBe(25);
  });

  it('轻微改善 → 无效', () => {
    const r = assessRehabilitationEffect(40, 45);
    expect(r.effective).toBe(false);
  });
});

describe('classifyGeriatricSyndrome', () => {
  it('多种综合征 → 高风险', () => {
    const p: GeriatricPatient = {
      age: 82, hasFalls: true, hasCognitiveImpairment: true,
      hasUrinaryIncontinence: true, hasMalnutrition: false, hasPolypharmacy: false,
    };
    const r = classifyGeriatricSyndrome(p);
    expect(r.syndromes.length).toBeGreaterThanOrEqual(3);
    expect(r.riskLevel).toBe('高风险');
  });

  it('无综合征 → 低风险', () => {
    const p: GeriatricPatient = {
      age: 70, hasFalls: false, hasCognitiveImpairment: false,
      hasUrinaryIncontinence: false, hasMalnutrition: false, hasPolypharmacy: false,
    };
    const r = classifyGeriatricSyndrome(p);
    expect(r.riskLevel).toBe('低风险');
  });
});

describe('buildRehabilitationReport', () => {
  it('生成评定数据', () => {
    const r = buildRehabilitationReport('康复科', '30d');
    expect(r.assessment.adlPatients).toBeGreaterThan(0);
  });

  it('生成治疗数据', () => {
    const r = buildRehabilitationReport('康复科', '30d');
    expect(r.treatment.physical).toBeGreaterThan(0);
  });

  it('生成老年数据', () => {
    const r = buildRehabilitationReport('老年科', '30d');
    expect(r.geriatrics.cgaCompleted).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildRehabilitationReport('康复科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

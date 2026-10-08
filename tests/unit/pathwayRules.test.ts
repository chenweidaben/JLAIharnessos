/**
 * 健澜科技 jlmedaios - 临床路径规则引擎单测（M15-A）
 *
 * 纯函数、确定性、无 I/O。覆盖阶段日/ICD 前缀匹配/标准核对/排除/变异分类/指标除零边界/
 * 表单项 -> 医嘱草稿映射。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  currentStageDay,
  icdMatches,
  matchPathway,
  evaluateCriteria,
  hasExclusion,
  classifyVariation,
  negativeVariationSuggestsWithdraw,
  computePathwayMetrics,
  buildOrderFromFormItem,
} from '../../src/medical-tools/pathway/pathwayRules.js';

describe('M15-A pathwayRules 阶段日计算', () => {
  it('入院当天为第 1 天', () => {
    const now = new Date('2026-10-08T10:00:00Z');
    expect(currentStageDay('2026-10-08T08:00:00Z', now)).toBe(1);
  });
  it('入院满 2 整天为第 3 天', () => {
    const now = new Date('2026-10-10T10:00:00Z');
    expect(currentStageDay('2026-10-08T08:00:00Z', now)).toBe(3);
  });
  it('未来入院时间或非法值兜底为第 1 天', () => {
    const now = new Date('2026-10-08T10:00:00Z');
    expect(currentStageDay('2026-10-09T08:00:00Z', now)).toBe(1);
    expect(currentStageDay('not-a-date', now)).toBe(1);
  });
});

describe('M15-A pathwayRules ICD 前缀匹配', () => {
  it('患者编码更细可命中路径编码', () => {
    expect(icdMatches('J18.901', 'J18.9')).toBe(true);
  });
  it('路径编码更细亦可命中（双向）', () => {
    expect(icdMatches('J18.9', 'J18.901')).toBe(true);
  });
  it('不同病种不匹配', () => {
    expect(icdMatches('J18.9', 'J44.0')).toBe(false);
  });
  it('大小写不敏感且去空白', () => {
    expect(icdMatches(' j18.9 ', 'J18.9')).toBe(true);
  });
  it('任一为空不匹配', () => {
    expect(icdMatches('', 'J18.9')).toBe(false);
    expect(icdMatches('J18.9', null)).toBe(false);
  });
  it('matchPathway 命中首个 active 路径，停用路径跳过', () => {
    const defs = [
      { id: '1', pathwayCode: 'PW-X', name: 'x', icdCode: 'J44.0', status: 'retired' },
      { id: '2', pathwayCode: 'PW-CAP', name: '肺炎', icdCode: 'J18.9', status: 'active' },
    ];
    const r = matchPathway('J18.901', defs);
    expect(r.matched).toBe(true);
    expect(r.def?.pathwayCode).toBe('PW-CAP');
    expect(matchPathway('E11.9', defs).matched).toBe(false);
  });
});

describe('M15-A pathwayRules 标准核对与排除', () => {
  const all = ['体温正常', '白细胞正常', '影像吸收'];
  it('全部满足 -> allMet', () => {
    const r = evaluateCriteria(['体温正常', '白细胞正常', '影像吸收'], all);
    expect(r.allMet).toBe(true);
    expect(r.unmet).toEqual([]);
  });
  it('部分满足 -> 列出未满足项', () => {
    const r = evaluateCriteria(['体温正常'], all);
    expect(r.allMet).toBe(false);
    expect(r.unmet).toEqual(['白细胞正常', '影像吸收']);
    expect(r.met).toEqual(['体温正常']);
  });
  it('空标准 -> allMet', () => {
    expect(evaluateCriteria([], []).allMet).toBe(true);
  });
  it('命中任一排除项即 true', () => {
    const ex = ['妊娠', '机械通气'];
    expect(hasExclusion(['机械通气'], ex)).toBe(true);
    expect(hasExclusion([], ex)).toBe(false);
    expect(hasExclusion(['其他'], ex)).toBe(false);
  });
});

describe('M15-A pathwayRules 变异分类与退出提示', () => {
  it('提前出院为正性，其余为负性', () => {
    expect(classifyVariation('early_discharge')).toBe('positive');
    expect(classifyVariation('complication')).toBe('negative');
    expect(classifyVariation('patient_reason')).toBe('negative');
  });
  it('并发症/诊断修正提示退出', () => {
    expect(negativeVariationSuggestsWithdraw('complication')).toBe(true);
    expect(negativeVariationSuggestsWithdraw('diagnosis_change')).toBe(true);
    expect(negativeVariationSuggestsWithdraw('resistance')).toBe(false);
    expect(negativeVariationSuggestsWithdraw('patient_reason')).toBe(false);
  });
});

describe('M15-A pathwayRules 质控指标（除零保护）', () => {
  it('正常计算分子分母与百分比', () => {
    const m = computePathwayMetrics({
      eligibleCount: 10, enrolledCount: 5, completedCount: 4, withdrawnCount: 1,
      variedCount: 2, losValues: [8, 9, 7, 8], feeValues: [1000, 2000],
      categoryCounts: { complication: 2 },
    });
    expect(m.enrollmentRate).toEqual({ numerator: 5, denominator: 10, rate: 50 });
    expect(m.completionRate).toEqual({ numerator: 4, denominator: 5, rate: 80 });
    expect(m.withdrawalRate).toEqual({ numerator: 1, denominator: 5, rate: 20 });
    expect(m.avgLos).toBe(8);
    expect(m.avgFee).toBe(1500);
    expect(m.variationCategoryDistribution).toEqual({ complication: 2 });
  });
  it('分母为 0 时 rate=null，平均值为空数组为 null', () => {
    const m = computePathwayMetrics({
      eligibleCount: 0, enrolledCount: 0, completedCount: 0, withdrawnCount: 0,
      variedCount: 0, losValues: [], feeValues: [], categoryCounts: {},
    });
    expect(m.enrollmentRate.rate).toBeNull();
    expect(m.completionRate.denominator).toBe(0);
    expect(m.avgLos).toBeNull();
    expect(m.avgFee).toBeNull();
  });
});

describe('M15-A pathwayRules 表单项 -> 医嘱草稿', () => {
  it('纯映射，不写库，detail 标记来源', () => {
    const draft = buildOrderFromFormItem({
      id: 'f1', stageDay: 2, itemCode: 'CAP-D2-01', itemType: 'drug',
      content: '经验性抗感染治疗', required: true,
    });
    expect(draft.orderType).toBe('drug');
    expect(draft.content).toBe('经验性抗感染治疗');
    expect(draft.detail).toMatchObject({ source: 'clinical_pathway', itemCode: 'CAP-D2-01' });
  });
});

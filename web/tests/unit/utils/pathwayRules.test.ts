/**
 * 健澜科技 jlmedaios - 临床路径纯函数规则引擎单测（M15-A / M15A_TEST）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：当前住院日、ICD 前缀匹配（含更细码/大小写）、入/出院标准逐项核对、排除项命中、
 * 变异分类与退出提示、表单→医嘱草稿映射、质控指标分子分母（除零/空样本边界）。纯函数、确定性、无 I/O。
 */
import { describe, it, expect } from 'vitest';
import {
  buildOrderFromFormItem,
  classifyVariation,
  computePathwayMetrics,
  currentStageDay,
  evaluateCriteria,
  hasExclusion,
  matchPathway,
  negativeVariationSuggestsWithdraw,
} from '@/utils/pathwayRules';
import type { PathwayDefinition, PathwayFormItem } from '@/types/pathway';

function def(over: Partial<PathwayDefinition> = {}): PathwayDefinition {
  return {
    id: 'pw1',
    pathwayCode: 'PW-CAP',
    name: '社区获得性肺炎',
    icdCode: 'J18.9',
    applicableDepartments: [],
    standardLos: 8,
    inclusionCriteria: ['年龄≥18', '影像学证实肺炎'],
    exclusionCriteria: ['重症需 ICU', '活动性结核'],
    dischargeCriteria: ['体温正常>24h', '影像学吸收'],
    version: '1.0',
    status: 'active',
    sourceKnowledgeId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

describe('M15A_TEST 当前住院日', () => {
  const t0 = new Date('2026-10-08T08:00:00.000Z');
  it('入院当天为第 1 天', () => {
    expect(currentStageDay('2026-10-08T06:00:00.000Z', t0)).toBe(1);
  });
  it('入院 1 天后为第 2 天', () => {
    expect(currentStageDay('2026-10-07T06:00:00.000Z', t0)).toBe(2);
  });
  it('未来入院时间保守回退第 1 天', () => {
    expect(currentStageDay('2026-10-09T08:00:00.000Z', t0)).toBe(1);
  });
  it('空/非法时间回退第 1 天', () => {
    expect(currentStageDay(null, t0)).toBe(1);
    expect(currentStageDay('not-a-date', t0)).toBe(1);
  });
});

describe('M15A_TEST 路径匹配（ICD 前缀）', () => {
  const defs = [def()];
  it('患者诊断更细 J18.901 命中 J18.9', () => {
    const r = matchPathway('J18.901', defs);
    expect(r.matched).toBe(true);
    expect(r.def?.pathwayCode).toBe('PW-CAP');
  });
  it('大小写不敏感', () => {
    expect(matchPathway('j18.901', defs).matched).toBe(true);
  });
  it('患者码为路径码前缀亦命中', () => {
    expect(matchPathway('J18', [def({ icdCode: 'J18.9' })]).matched).toBe(true);
  });
  it('不相关诊断不命中', () => {
    expect(matchPathway('E11.9', defs).matched).toBe(false);
  });
  it('空诊断码不命中', () => {
    expect(matchPathway('', defs).matched).toBe(false);
    expect(matchPathway(null, defs).matched).toBe(false);
  });
  it('停用路径不命中', () => {
    expect(matchPathway('J18.9', [def({ status: 'retired' })]).matched).toBe(false);
  });
});

describe('M15A_TEST 标准逐项核对', () => {
  const all = ['体温正常>24h', '影像学吸收', '白细胞正常'];
  it('全部确认 → allMet', () => {
    const r = evaluateCriteria(['体温正常>24h', '影像学吸收', '白细胞正常'], all);
    expect(r.allMet).toBe(true);
    expect(r.unmet).toHaveLength(0);
  });
  it('部分确认 → 列出未满足', () => {
    const r = evaluateCriteria(['体温正常>24h'], all);
    expect(r.allMet).toBe(false);
    expect(r.unmet).toEqual(['影像学吸收', '白细胞正常']);
    expect(r.met).toEqual(['体温正常>24h']);
  });
  it('空标准视为全部满足', () => {
    expect(evaluateCriteria([], []).allMet).toBe(true);
  });
});

describe('M15A_TEST 排除项命中', () => {
  it('命中任一排除项 → true', () => {
    expect(hasExclusion(['重症需 ICU'], ['重症需 ICU', '活动性结核'])).toBe(true);
  });
  it('无交集 → false', () => {
    expect(hasExclusion([], ['重症需 ICU'])).toBe(false);
    expect(hasExclusion(['其他'], ['重症需 ICU'])).toBe(false);
  });
});

describe('M15A_TEST 变异分类与退出提示', () => {
  it('提前达到出院标准为正性变异', () => {
    expect(classifyVariation('early_discharge')).toBe('positive');
  });
  it('其余为负性变异', () => {
    expect(classifyVariation('complication')).toBe('negative');
    expect(classifyVariation('patient_reason')).toBe('negative');
  });
  it('并发症/诊断修正建议退出', () => {
    expect(negativeVariationSuggestsWithdraw('complication')).toBe(true);
    expect(negativeVariationSuggestsWithdraw('diagnosis_change')).toBe(true);
  });
  it('耐药/检查异常/患者原因不强制退出', () => {
    expect(negativeVariationSuggestsWithdraw('resistance')).toBe(false);
    expect(negativeVariationSuggestsWithdraw('patient_reason')).toBe(false);
  });
});

describe('M15A_TEST 表单→医嘱草稿映射', () => {
  it('药物映射 medication 并保留内容与必选标记', () => {
    const item: PathwayFormItem = {
      id: 'f1',
      pathwayId: 'pw1',
      stageDay: 2,
      stageName: '抗感染治疗',
      itemCode: 'CAP-D2-01',
      itemType: 'drug',
      content: '头孢呋辛 1.5g ivgtt q12h',
      required: true,
      sortOrder: 1,
      createdAt: '2026-10-01T00:00:00.000Z',
    };
    const draft = buildOrderFromFormItem(item);
    expect(draft.orderType).toBe('medication');
    expect(draft.content).toBe('头孢呋辛 1.5g ivgtt q12h');
    expect(draft.detail).toContain('CAP-D2-01');
  });
  it('未知类型回退 other', () => {
    const draft = buildOrderFromFormItem({
      id: 'f2', pathwayId: 'pw1', stageDay: 1, stageName: 'x', itemCode: 'x',
      itemType: 'other', content: 'x', required: false, sortOrder: 0,
      createdAt: '',
    });
    expect(draft.orderType).toBe('other');
  });
});

describe('M15A_TEST 质控指标分子分母', () => {
  it('四项比率与平均住院日/费用正确聚合', () => {
    const m = computePathwayMetrics({
      eligibleCount: 100,
      enrolledCount: 60,
      completedCount: 45,
      withdrawnCount: 10,
      withVariationCount: 20,
      sumLos: 360,
      completedSampleCount: 45,
      sumFee: 900000,
      variationCategoryCounts: { complication: 8, patient_reason: 12 },
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(m.enrollmentRate).toEqual({ numerator: 60, denominator: 100, rate: 60 });
    expect(m.completionRate.rate).toBe(75); // 45/60
    expect(m.variationRate.rate).toBeCloseTo(33.33);
    expect(m.withdrawalRate.rate).toBeCloseTo(16.67);
    expect(m.avgLos).toBe(8);
    expect(m.avgFee).toBe(20000);
    expect(m.variationCategoryDistribution.complication).toBe(8);
  });
  it('分母为 0 → rate=null 且不抛错；无样本 avgLos/avgFee=null', () => {
    const m = computePathwayMetrics({
      eligibleCount: 0,
      enrolledCount: 0,
      completedCount: 0,
      withdrawnCount: 0,
      withVariationCount: 0,
      sumLos: 0,
      completedSampleCount: 0,
      sumFee: 0,
      variationCategoryCounts: {},
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(m.enrollmentRate.rate).toBeNull();
    expect(m.completionRate.rate).toBeNull();
    expect(m.avgLos).toBeNull();
    expect(m.avgFee).toBeNull();
  });
});

/**
 * 健澜科技 jlmedaios - AI 治疗方案推荐·个体化用药 单测（M161-C）「AI核心能力深化」
 *
 * 覆盖：方案生成（一线/备选/疗程复查）、剂量个体化调整（年龄/体重/肾功能/孕哺）、
 *       药物相互作用冲突检查、以及两方案比选。纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  adjustDose,
  checkDrugInteraction,
  compareTreatmentOptions,
  DEFAULT_GUIDELINE_LIBRARY,
  generateTreatmentPlan,
  type RegimenDrug,
} from '../../src/bff/aggregators/treatmentPlanAggregator.js';

describe('M161-C 治疗方案生成', () => {
  it('命中指南库：返回一线/备选/疗程复查', () => {
    const plan = generateTreatmentPlan('P-1', '高血压', DEFAULT_GUIDELINE_LIBRARY);
    expect(plan.matched).toBe(true);
    expect(plan.diagnosis).toBe('高血压');
    expect(plan.icd10).toBe('I10');
    expect(plan.firstLine.length).toBeGreaterThanOrEqual(1);
    expect(plan.alternatives.length).toBeGreaterThanOrEqual(1);
    expect(plan.courseWeeks).toBeGreaterThan(0);
    expect(plan.followUpItems.length).toBeGreaterThan(0);
  });

  it('大小写/空白归一化匹配诊断', () => {
    const plan = generateTreatmentPlan('P-2', ' 2型糖尿病 ', DEFAULT_GUIDELINE_LIBRARY);
    expect(plan.matched).toBe(true);
    expect(plan.firstLine[0].drug).toBe('二甲双胍');
  });

  it('未命中诊断：安全降级为空骨架且 matched=false', () => {
    const plan = generateTreatmentPlan('P-3', '罕见病XYZ', DEFAULT_GUIDELINE_LIBRARY);
    expect(plan.matched).toBe(false);
    expect(plan.firstLine).toHaveLength(0);
    expect(plan.alternatives).toHaveLength(0);
    expect(plan.disclaimer).toContain('AI');
  });

  it('patientId 回传且非法输入安全降级', () => {
    const plan = generateTreatmentPlan('  ', '', DEFAULT_GUIDELINE_LIBRARY);
    expect(plan.patientId).toBe('UNKNOWN');
    expect(plan.matched).toBe(false);
  });
});

describe('M161-C 剂量个体化调整', () => {
  const metformin: RegimenDrug = { drug: '二甲双胍', perDoseMg: 500, dosesPerDay: 2 };

  it('健康成人沿用标准剂量', () => {
    const adj = adjustDose({ age: 50, weightKg: 65, egfr: 90 }, metformin);
    expect(adj.adjustedPerDoseMg).toBe(500);
    expect(adj.factor).toBe(1);
    expect(adj.contraindicated).toBe(false);
    expect(adj.reasons.join('')).toContain('无显著偏移');
  });

  it('高龄+低体重+肾功能不全：多因素叠加减量', () => {
    const adj = adjustDose({ age: 78, weightKg: 46, egfr: 42 }, metformin);
    // 0.75(≥75) × 0.92(<50kg) × 0.75(eGFR<50) = 0.5175 → 500×0.5175≈259
    expect(adj.factor).toBeCloseTo(0.518, 2);
    expect(adj.adjustedPerDoseMg).toBeLessThan(500);
    expect(adj.adjustedPerDoseMg).toBeGreaterThan(200);
    expect(adj.reasons.join('')).toContain('老年');
    expect(adj.reasons.join('')).toContain('低体重');
    expect(adj.reasons.join('')).toContain('肾功能');
  });

  it('妊娠期他汀：判定为禁用', () => {
    const statin: RegimenDrug = { drug: '阿托伐他汀', perDoseMg: 20, dosesPerDay: 1 };
    const adj = adjustDose({ pregnant: true, age: 30 }, statin);
    expect(adj.contraindicated).toBe(true);
    expect(adj.adjustedPerDoseMg).toBe(0);
    expect(adj.reasons.join('')).toContain('妊娠');
  });
});

describe('M161-C 药物相互作用检查', () => {
  it('华法林 + 阿司匹林：high 出血冲突', () => {
    const findings = checkDrugInteraction(['华法林'], ['阿司匹林']);
    const hit = findings.find((f) => f.level === 'high');
    expect(hit).toBeDefined();
    expect(hit!.title).toContain('出血');
  });

  it('在用×在用 也被检查（依那普利+螺内酯高钾）', () => {
    const findings = checkDrugInteraction(['依那普利', '螺内酯'], []);
    expect(findings.some((f) => f.title.includes('高钾'))).toBe(true);
  });

  it('无冲突组合返回空且按级别排序', () => {
    expect(checkDrugInteraction([], ['阿莫西林'])).toHaveLength(0);
    const mixed = checkDrugInteraction(['辛伐他汀'], ['克拉霉素', '布洛芬']);
    // 辛伐他汀+克拉霉素(high) 应排在 阿司匹林类(low 不命中布洛芬) 之前；high 必须第一
    expect(mixed[0].level).toBe('high');
  });

  it('空/非法输入安全降级为无结果', () => {
    expect(checkDrugInteraction(undefined as never, null as never)).toHaveLength(0);
  });
});

describe('M161-C 治疗方案比选', () => {
  it('肾功能不全患者：优先低肾毒性选项', () => {
    const A = { id: 'A', name: '高肾毒方案', drugs: ['x'], efficacy: 80, sideEffectRisk: 30, renalToxicity: 80, cost: 30 };
    const B = { id: 'B', name: '低肾毒方案', drugs: ['y'], efficacy: 78, sideEffectRisk: 35, renalToxicity: 10, cost: 40 };
    const cmp = compareTreatmentOptions(A, B, { age: 70, egfr: 35 });
    expect(cmp.recommended).toBe('B');
    expect(cmp.winner).toBe('低肾毒方案');
    expect(cmp.reasons.join('')).toContain('eGFR');
  });

  it('妊娠患者：比选结果仅作辅助并提示人工复核', () => {
    const A = { id: 'A', name: '方案甲', drugs: ['x'], efficacy: 80, sideEffectRisk: 20, renalToxicity: 20, cost: 30 };
    const B = { id: 'B', name: '方案乙', drugs: ['y'], efficacy: 82, sideEffectRisk: 25, renalToxicity: 20, cost: 50 };
    const cmp = compareTreatmentOptions(A, B, { pregnant: true });
    expect(cmp.reasons.join('')).toContain('妊娠');
    expect(typeof cmp.tradeoff).toBe('string');
  });
});

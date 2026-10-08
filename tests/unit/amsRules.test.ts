/**
 * 健澜科技 jlmedaios - 抗菌药物管理规则引擎单测（M14-A）
 *
 * 纯函数、确定性、无 I/O。覆盖分级/权限/围术期时机与疗程/DDD 计算边界。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  titleToMaxLevel,
  prescriberMaxLevel,
  canPrescribe,
  evaluatePerioperative,
  evaluateAntibioticUse,
  computeDdds,
  computeAud,
  computeAmsMetrics,
} from '../../src/medical-tools/ams/amsRules.js';

describe('M14-A amsRules 职称与授权', () => {
  it('住院医师 -> 非限制使用级', () => {
    expect(titleToMaxLevel('住院医师')).toBe('unrestricted');
  });
  it('主治医师 -> 限制使用级', () => {
    expect(titleToMaxLevel('主治医师')).toBe('restricted');
  });
  it('副主任/主任医师 -> 特殊使用级', () => {
    expect(titleToMaxLevel('副主任医师')).toBe('special');
    expect(titleToMaxLevel('主任医师')).toBe('special');
  });
  it('授权与职称取较低者', () => {
    // 授权 special 但职称主治 -> restricted
    expect(prescriberMaxLevel('special', '主治医师')).toBe('restricted');
    // 授权 unrestricted 但职称主任 -> unrestricted（保守）
    expect(prescriberMaxLevel('unrestricted', '主任医师')).toBe('unrestricted');
    // 无授权按职称兜底
    expect(prescriberMaxLevel(null, '主任医师')).toBe('special');
  });
});

describe('M14-A amsRules 越权判定', () => {
  it('可开同级与更低，不可开更高', () => {
    expect(canPrescribe('restricted', 'unrestricted')).toBe(true);
    expect(canPrescribe('restricted', 'restricted')).toBe(true);
    expect(canPrescribe('restricted', 'special')).toBe(false);
    expect(canPrescribe('unrestricted', 'special')).toBe(false);
  });
});

describe('M14-A amsRules 围术期点评', () => {
  it('I 类切口选一/二代头孢且时机疗程合理 -> 合理', () => {
    const v = evaluatePerioperative({
      incisionClass: 'I', drugClass: 'cephalosporin_2', timingMinutes: 45, durationHours: 24,
    });
    expect(v.rational).toBe(true);
    expect(v.issueTypes).toEqual([]);
  });
  it('I 类切口选三代头孢 -> drug_not_recommended', () => {
    const v = evaluatePerioperative({
      incisionClass: 'I', drugClass: 'cephalosporin_3', timingMinutes: 45, durationHours: 24,
    });
    expect(v.rational).toBe(false);
    expect(v.issueTypes).toContain('drug_not_recommended');
  });
  it('时机过早/过晚 -> timing_incorrect', () => {
    expect(evaluatePerioperative({ incisionClass: 'I', drugClass: 'cephalosporin_1', timingMinutes: 10 }).issueTypes).toContain('timing_incorrect');
    expect(evaluatePerioperative({ incisionClass: 'I', drugClass: 'cephalosporin_1', timingMinutes: 120 }).issueTypes).toContain('timing_incorrect');
  });
  it('疗程边界：24h 合格，>48h 判 duration_excessive', () => {
    expect(evaluatePerioperative({ incisionClass: 'I', drugClass: 'cephalosporin_1', timingMinutes: 45, durationHours: 24 }).rational).toBe(true);
    expect(evaluatePerioperative({ incisionClass: 'I', drugClass: 'cephalosporin_1', timingMinutes: 45, durationHours: 30 }).issueTypes).toContain('duration_over_24h');
    expect(evaluatePerioperative({ incisionClass: 'I', drugClass: 'cephalosporin_1', timingMinutes: 45, durationHours: 72 }).issueTypes).toContain('duration_excessive');
  });
  it('剖宫产断脐后给药时机不算错误', () => {
    const v = evaluatePerioperative({
      incisionClass: 'I', drugClass: 'cephalosporin_1', isCesarean: true, timingMinutes: 0, durationHours: 24,
    });
    expect(v.issueTypes).not.toContain('timing_incorrect');
  });
});

describe('M14-A amsRules 处方/医嘱专项点评', () => {
  it('有指征、常规剂量、无重复/禁忌 -> 合理', () => {
    expect(evaluateAntibioticUse({ indication: 'documented' }).rational).toBe(true);
  });
  it('无指征 -> no_indication', () => {
    expect(evaluateAntibioticUse({ indication: 'none' }).issueTypes).toContain('no_indication');
  });
  it('超量 -> overdose；超疗程 -> over_duration', () => {
    expect(evaluateAntibioticUse({ indication: 'documented', doseMultiplier: 3 }).issueTypes).toContain('overdose');
    expect(evaluateAntibioticUse({ indication: 'documented', durationDays: 21 }).issueTypes).toContain('over_duration');
  });
  it('重复用药/禁忌/相互作用', () => {
    expect(evaluateAntibioticUse({ indication: 'documented', duplicate: true }).issueTypes).toContain('duplicate');
    expect(evaluateAntibioticUse({ indication: 'documented', contraindication: true }).issueTypes).toContain('contraindication');
    expect(evaluateAntibioticUse({ indication: 'documented', interaction: true }).issueTypes).toContain('interaction');
  });
});

describe('M14-A amsRules DDDs / AUD', () => {
  it('computeDdds = 总量 / DDD', () => {
    expect(computeDdds(30, 3)).toBe(10);
  });
  it('DDD 非法返回 0', () => {
    expect(computeDdds(30, 0)).toBe(0);
  });
  it('computeAud = DDDs/人天*100', () => {
    expect(computeAud(100, 500)).toBe(20);
  });
  it('人天非法返回 0', () => {
    expect(computeAud(100, 0)).toBe(0);
  });
});

describe('M14-A amsRules 质控指标 fractions', () => {
  it('返回分子分母，分母为 0 比率为 0', () => {
    const m = computeAmsMetrics([
      { inpatientAbx: true, specialLevel: true, therapeutic: true, therapeuticWithCulture: false },
      { inpatientAbx: false, specialLevel: false, therapeutic: true, therapeuticWithCulture: true },
    ]);
    expect(m.fractions.inpatientUseRate.numerator).toBe(1);
    expect(m.fractions.inpatientUseRate.denominator).toBe(2);
    expect(m.fractions.specialProportion.numerator).toBe(1);
    expect(m.fractions.cultureRate.numerator).toBe(1);
    expect(m.fractions.cultureRate.denominator).toBe(2);
  });
  it('空集比率为 0', () => {
    const m = computeAmsMetrics([]);
    expect(m.inpatientUseRate).toBe(0);
    expect(m.fractions.specialProportion.denominator).toBe(0);
  });
});

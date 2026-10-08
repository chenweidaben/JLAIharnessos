/**
 * 健澜科技 jlmedaios - 抗菌药物管理（AMS）纯函数规则引擎单测（M14-A / M14A_TEST）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：处方权限分层/越权、围术期选药/时机/疗程边界、专项点评各问题、DDD/AUD（含 0 边界）、
 * 八项质控指标分子分母。纯函数、确定性、无 I/O。
 */
import { describe, it, expect } from 'vitest';
import {
  canPrescribe,
  computeAud,
  computeAmsMetrics,
  computeDdds,
  evaluateAntibioticUse,
  evaluatePerioperative,
  prescriberMaxLevel,
  titleToMaxLevel,
} from '@/utils/amsRules';

describe('M14A_TEST 处方权限分级', () => {
  it('住院医师/resident → 非限制使用级', () => {
    expect(titleToMaxLevel('住院医师')).toBe('unrestricted');
    expect(titleToMaxLevel('resident')).toBe('unrestricted');
  });
  it('主治医师/attending → 限制使用级', () => {
    expect(titleToMaxLevel('主治医师')).toBe('restricted');
    expect(titleToMaxLevel('attending')).toBe('restricted');
  });
  it('副主任/主任医师 → 特殊使用级', () => {
    expect(titleToMaxLevel('副主任医师')).toBe('special');
    expect(titleToMaxLevel('主任医师')).toBe('special');
    expect(titleToMaxLevel('chief')).toBe('special');
  });
  it('未知/空职称保守回退非限制', () => {
    expect(titleToMaxLevel(null)).toBe('unrestricted');
    expect(titleToMaxLevel('')).toBe('unrestricted');
    expect(titleToMaxLevel('unknown')).toBe('unrestricted');
  });
  it('prescriberMaxLevel：授权优先于职称推导', () => {
    expect(prescriberMaxLevel({ grantedLevel: 'special', grantActive: true, title: '住院医师' })).toBe('special');
  });
  it('prescriberMaxLevel：无授权记录回退职称', () => {
    expect(prescriberMaxLevel({ grantedLevel: null, grantActive: false, title: 'attending' })).toBe('restricted');
  });
  it('canPrescribe：同等级可开，低等级开高级为越权', () => {
    expect(canPrescribe('restricted', 'restricted')).toBe(true);
    expect(canPrescribe('special', 'unrestricted')).toBe(true);
    expect(canPrescribe('unrestricted', 'special')).toBe(false);
    expect(canPrescribe('unrestricted', 'restricted')).toBe(false);
  });
});

describe('M14A_TEST 围术期预防用药点评', () => {
  const base = {
    incisionClass: 'I' as const,
    chosenClass: 'cephalosporin_1' as const,
    chosenIsSpecial: false,
    doseMinusIncisionMin: 45,
    isCesarean: false,
    cordClampMinusDoseMin: null,
    durationH: 24,
    hasProlongReason: false,
    anaerobicSite: false,
  };
  it('I 类一代头孢 + 切皮前45min + 24h → 合理', () => {
    const r = evaluatePerioperative(base);
    expect(r.rational).toBe(true);
    expect(r.issues).toHaveLength(0);
  });
  it('I 类无依据选特殊使用级 → wrong_choice', () => {
    const r = evaluatePerioperative({ ...base, chosenIsSpecial: true, chosenClass: 'cephalosporin_4' });
    expect(r.issues).toContain('wrong_choice');
  });
  it('切皮前 10min（超出 30–60 窗口）→ wrong_timing', () => {
    const r = evaluatePerioperative({ ...base, doseMinusIncisionMin: 10 });
    expect(r.issues).toContain('wrong_timing');
  });
  it('切皮后给药（负值）→ wrong_timing', () => {
    const r = evaluatePerioperative({ ...base, doseMinusIncisionMin: -15 });
    expect(r.issues).toContain('wrong_timing');
  });
  it('剖宫产未断脐即给药 → wrong_timing', () => {
    const r = evaluatePerioperative({ ...base, isCesarean: true, cordClampMinusDoseMin: -10 });
    expect(r.issues).toContain('wrong_timing');
  });
  it('剖宫产断脐后给药 → 不判时机错误', () => {
    const r = evaluatePerioperative({ ...base, isCesarean: true, cordClampMinusDoseMin: 5 });
    expect(r.issues).not.toContain('wrong_timing');
  });
  it('I 类疗程 36h 无依据 → wrong_duration', () => {
    const r = evaluatePerioperative({ ...base, durationH: 36 });
    expect(r.issues).toContain('wrong_duration');
  });
  it('I 类疗程 48h 有延长依据 → 不判疗程错误', () => {
    const r = evaluatePerioperative({ ...base, durationH: 48, hasProlongReason: true });
    expect(r.issues).not.toContain('wrong_duration');
  });
  it('I 类疗程 60h 即使有依据仍 wrong_duration', () => {
    const r = evaluatePerioperative({ ...base, durationH: 60, hasProlongReason: true });
    expect(r.issues).toContain('wrong_duration');
  });
});

describe('M14A_TEST 治疗性用药专项点评', () => {
  const clean = {
    hasIndication: true,
    drugLevel: 'restricted' as const,
    dose: 1.0,
    ddd: 1.0,
    plannedDays: 7,
    maxDays: 10,
    sameClassDrugs: 1,
    severeInteraction: false,
    contraindication: false,
    cultureSent: true,
  };
  it('全部满足 → 合理', () => {
    expect(evaluateAntibioticUse(clean).rational).toBe(true);
  });
  it('无指征 → no_indication', () => {
    expect(evaluateAntibioticUse({ ...clean, hasIndication: false }).issues).toContain('no_indication');
  });
  it('单次剂量 > DDD → overdose', () => {
    expect(evaluateAntibioticUse({ ...clean, dose: 2.5, ddd: 1.0 }).issues).toContain('overdose');
  });
  it('超疗程 → overduration', () => {
    expect(evaluateAntibioticUse({ ...clean, plannedDays: 14, maxDays: 10 }).issues).toContain('overduration');
  });
  it('同药两种 → duplicate', () => {
    expect(evaluateAntibioticUse({ ...clean, sameClassDrugs: 2 }).issues).toContain('duplicate');
  });
  it('严重相互作用 → interaction', () => {
    expect(evaluateAntibioticUse({ ...clean, severeInteraction: true }).issues).toContain('interaction');
  });
  it('禁忌 → contraindication', () => {
    expect(evaluateAntibioticUse({ ...clean, contraindication: true }).issues).toContain('contraindication');
  });
  it('特殊使用级治疗未送检 → no_culture', () => {
    expect(evaluateAntibioticUse({ ...clean, drugLevel: 'special', cultureSent: false }).issues).toContain('no_culture');
  });
  it('问题可叠加（无指征 + 超量）', () => {
    const r = evaluateAntibioticUse({ ...clean, hasIndication: false, dose: 3, ddd: 1 });
    expect(r.issues).toEqual(expect.arrayContaining(['no_indication', 'overdose']));
    expect(r.rational).toBe(false);
  });
});

describe('M14A_TEST DDD / AUD', () => {
  it('computeDdds = 总量 / DDD', () => {
    expect(computeDdds(30, 3)).toBe(10);
  });
  it('DDD 为 0 → null', () => {
    expect(computeDdds(30, 0)).toBeNull();
  });
  it('computeAud = DDDs/人天×100', () => {
    expect(computeAud(100, 500)).toBe(20);
  });
  it('人天为 0 → null', () => {
    expect(computeAud(100, 0)).toBeNull();
  });
});

describe('M14A_TEST 八项质控指标', () => {
  it('分子分母与百分比正确聚合', () => {
    const m = computeAmsMetrics({
      outpatientAbxPrescriptions: 25,
      outpatientTotalPrescriptions: 100,
      inpatientAbxPatients: 40,
      inpatientTotalPatients: 200,
      totalDdds: 800,
      specialDdds: 80,
      inpatientPatientDays: 1000,
      classIProphylaxis: 18,
      classITotal: 20,
      timingAppropriate: 9,
      perioperativeTotal: 10,
      durationCompliant: 8,
      cultureSentTherapeutic: 15,
      therapeuticTotal: 20,
    });
    expect(m.outpatientAbxRate).toBe(25);
    expect(m.inpatientAbxRate).toBe(20);
    expect(m.aud).toBe(80);
    expect(m.specialShare).toBe(10);
    expect(m.cultureRate).toBe(75);
    expect(m.fractions.outpatientAbxRate).toEqual({ numerator: 25, denominator: 100 });
    expect(m.fractions.timingAppropriateRate.numerator).toBe(9);
  });
  it('分母为 0 → 比率 0 且不抛错', () => {
    const m = computeAmsMetrics({
      outpatientAbxPrescriptions: 0,
      outpatientTotalPrescriptions: 0,
      inpatientAbxPatients: 0,
      inpatientTotalPatients: 0,
      totalDdds: 0,
      specialDdds: 0,
      inpatientPatientDays: 0,
      classIProphylaxis: 0,
      classITotal: 0,
      timingAppropriate: 0,
      perioperativeTotal: 0,
      durationCompliant: 0,
      cultureSentTherapeutic: 0,
      therapeuticTotal: 0,
    });
    expect(m.outpatientAbxRate).toBe(0);
    expect(m.aud).toBe(0);
  });
});

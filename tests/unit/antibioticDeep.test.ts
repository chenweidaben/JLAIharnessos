/**
 * 健澜科技 jlmedaios - 【临床核心深化】抗菌药物管理深化纯函数单测（M176-B）
 *
 * 覆盖：抗菌药物分级（非限制/限制/特殊使用）、DDDs 计算、合理性评价。
 * 口径：国卫办医发〔2015〕42号《抗菌药物临床应用指导原则（2015年版）》。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepAntibioticMgmt,
  calculateAntibioticDDDs,
  classifyAntibioticLevel,
  evaluateAntibioticRationality,
} from '../../src/bff/aggregators/antibioticDeepAggregator';

/* ---------------------------------------------------------------------------
 * 0. 体系总览
 * ------------------------------------------------------------------------- */
describe('buildDeepAntibioticMgmt - 六大管理维度', () => {
  it('返回六大维度且挂国家口径目标', () => {
    const sys = buildDeepAntibioticMgmt();
    expect(sys.dimensions.length).toBe(6);
    expect(sys.nationalStandard).toContain('2015');
    expect(sys.guardrails.length).toBeGreaterThan(0);
    const names = sys.dimensions.map((d) => d.name);
    expect(names).toContain('分级管理');
    expect(names).toContain('使用强度（AUD）');
    expect(names).toContain('微生物送检率');
  });
});

/* ---------------------------------------------------------------------------
 * 1. 抗菌药物分级
 * ------------------------------------------------------------------------- */
describe('classifyAntibioticLevel - 三级分级', () => {
  it('碳青霉烯/糖肽类关键词判为特殊使用级', () => {
    expect(classifyAntibioticLevel('注射用美罗培南').level).toBe('special');
    expect(classifyAntibioticLevel('注射用亚胺培南西司他丁').level).toBe('special');
    expect(classifyAntibioticLevel('注射用盐酸万古霉素').level).toBe('special');
  });

  it('三代头孢/喹诺酮注射剂判为限制使用级', () => {
    expect(classifyAntibioticLevel('注射用头孢曲松钠').level).toBe('restricted');
    expect(classifyAntibioticLevel('左氧氟沙星注射液').level).toBe('restricted');
    expect(classifyAntibioticLevel('注射用头孢他啶').level).toBe('restricted');
  });

  it('一线口服抗菌药兜底为非限制使用级', () => {
    expect(classifyAntibioticLevel('阿莫西林胶囊').level).toBe('unrestricted');
    expect(classifyAntibioticLevel('头孢氨苄胶囊').level).toBe('unrestricted');
    expect(classifyAntibioticLevel('某某普通片剂').level).toBe('unrestricted');
  });

  it('显式级别优先于关键词推导', () => {
    const r = classifyAntibioticLevel({ drugName: '阿莫西林胶囊', level: 'special' });
    expect(r.level).toBe('special');
    expect(r.levelName).toBe('特殊使用级');
  });

  it('特殊使用级附带会诊审批要求说明', () => {
    const r = classifyAntibioticLevel('美罗培南');
    expect(r.ruleNote).toContain('会诊审批');
  });
});

/* ---------------------------------------------------------------------------
 * 2. DDDs 计算
 * ------------------------------------------------------------------------- */
describe('calculateAntibioticDDDs - DDDs 与 AUD', () => {
  it('逐张处方 DDDs = 消耗量(g) ÷ DDD(g/日)，汇总总 DDDs', () => {
    const summary = calculateAntibioticDDDs([
      { drugName: '阿莫西林胶囊', totalAmountG: 30, ddd: 1 },   // 30
      { drugName: '头孢曲松钠', totalAmountG: 20, ddd: 2 },       // 10
      { drugName: '美罗培南', totalAmountG: 6, ddd: 2 },          // 3
    ]);
    expect(summary.totalDdds).toBe(43);
    expect(summary.byLevel.unrestricted).toBe(30);
    expect(summary.byLevel.restricted).toBe(10);
    expect(summary.byLevel.special).toBe(3);
  });

  it('DDD 非法（≤0）时该药 DDDs 记 0，不抛错', () => {
    const summary = calculateAntibioticDDDs([
      { drugName: 'DDD缺失药', totalAmountG: 50, ddd: 0 },
      { drugName: '阿莫西林胶囊', totalAmountG: 10, ddd: 1 },
    ]);
    expect(summary.totalDdds).toBe(10);
  });

  it('携带患者人天时折算 AUD = DDDs/人天×100（国家 ≤40）', () => {
    const summary = calculateAntibioticDDDs([
      { drugName: '阿莫西林胶囊', totalAmountG: 30, ddd: 1, patientDays: 200 },
      { drugName: '头孢曲松钠', totalAmountG: 20, ddd: 2 },
    ]);
    // 总 DDDs = 40，人天 200 → AUD = 40/200*100 = 20
    expect(summary.aud).toBe(20);
    expect(summary.patientDays).toBe(200);
  });

  it('空输入安全返回零值', () => {
    const summary = calculateAntibioticDDDs([]);
    expect(summary.totalDdds).toBe(0);
    expect(summary.aud).toBe(0);
  });

  it('分目的 DDDs 正确区分治疗性/预防性', () => {
    const summary = calculateAntibioticDDDs([
      { drugName: '阿莫西林胶囊', totalAmountG: 10, ddd: 1, purpose: 'therapeutic' },
      { drugName: '头孢唑林', totalAmountG: 5, ddd: 1, purpose: 'prophylactic' },
    ]);
    expect(summary.byPurpose.therapeutic).toBe(10);
    expect(summary.byPurpose.prophylactic).toBe(5);
  });
});

/* ---------------------------------------------------------------------------
 * 3. 合理性评价
 * ------------------------------------------------------------------------- */
describe('evaluateAntibioticRationality - 适应症/选药/剂量/疗程/送检', () => {
  const basePatient = { age: 50, allergies: [] };
  const baseCulture = { therapeutic: true, cultureSent: true, result: 'pending' as const };

  it('完整合规处方判合理、满分', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '阿莫西林胶囊', hasIndication: true,
        dailyDoseMg: 1500, recommendedDoseMg: 2000, durationDays: 7,
        purpose: 'therapeutic',
      },
      basePatient,
      baseCulture,
    );
    expect(r.rational).toBe(true);
    expect(r.score).toBe(100);
  });

  it('无适应症用药命中 no_indication（硬性不合理）', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '阿莫西林胶囊', hasIndication: false,
        dailyDoseMg: 1500, recommendedDoseMg: 2000, durationDays: 7,
        purpose: 'therapeutic',
      },
      basePatient,
      baseCulture,
    );
    expect(r.rational).toBe(false);
    expect(r.issues.some((i) => i.code === 'no_indication')).toBe(true);
  });

  it('单日剂量超说明书上限 2 倍命中 overdose', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '头孢曲松钠', hasIndication: true,
        dailyDoseMg: 6000, recommendedDoseMg: 2000, durationDays: 7,
        purpose: 'therapeutic',
      },
      basePatient,
      baseCulture,
    );
    expect(r.rational).toBe(false);
    expect(r.issues.some((i) => i.code === 'overdose')).toBe(true);
  });

  it('治疗性用药 >14 天命中超疗程警示', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '阿莫西林胶囊', hasIndication: true,
        dailyDoseMg: 1500, recommendedDoseMg: 2000, durationDays: 21,
        purpose: 'therapeutic',
      },
      basePatient,
      baseCulture,
    );
    expect(r.issues.some((i) => i.code === 'over_duration')).toBe(true);
  });

  it('治疗性使用前未送检命中 missing_culture', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '阿莫西林胶囊', hasIndication: true,
        dailyDoseMg: 1500, recommendedDoseMg: 2000, durationDays: 7,
        purpose: 'therapeutic',
      },
      basePatient,
      { therapeutic: true, cultureSent: false, result: 'none' },
    );
    expect(r.issues.some((i) => i.code === 'missing_culture')).toBe(true);
  });

  it('特殊使用级未会诊审批命中红线（硬性不合理）', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '美罗培南', hasIndication: true,
        dailyDoseMg: 2000, recommendedDoseMg: 4000, durationDays: 7,
        purpose: 'therapeutic', specialApproved: false,
      },
      basePatient,
      baseCulture,
    );
    expect(r.rational).toBe(false);
    expect(r.issues.some((i) => i.code === 'special_without_approval')).toBe(true);
  });

  it('过敏史与本品冲突命中 allergy_conflict', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '阿莫西林胶囊', hasIndication: true,
        dailyDoseMg: 1500, recommendedDoseMg: 2000, durationDays: 7,
        purpose: 'therapeutic',
      },
      { age: 50, allergies: ['阿莫西林'] },
      baseCulture,
    );
    expect(r.rational).toBe(false);
    expect(r.issues.some((i) => i.code === 'allergy_conflict')).toBe(true);
  });

  it('围术期预防用药 >48h 命中 prophylaxis_too_long', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '头孢唑林', hasIndication: true,
        dailyDoseMg: 2000, recommendedDoseMg: 4000, durationDays: 1,
        purpose: 'prophylactic', incisionClass: 'I',
        timingMinutes: 45, prophylaxisDurationHours: 72,
      },
      basePatient,
      { therapeutic: false, cultureSent: false },
    );
    expect(r.issues.some((i) => i.code === 'prophylaxis_too_long')).toBe(true);
  });

  it('围术期给药时机不在 30~60 分钟窗命中 timing_incorrect', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '头孢唑林', hasIndication: true,
        dailyDoseMg: 2000, recommendedDoseMg: 4000, durationDays: 1,
        purpose: 'prophylactic', incisionClass: 'I',
        timingMinutes: 120, prophylaxisDurationHours: 24,
      },
      basePatient,
      { therapeutic: false, cultureSent: false },
    );
    expect(r.issues.some((i) => i.code === 'timing_incorrect')).toBe(true);
  });

  it('评价结论附国家口径依据', () => {
    const r = evaluateAntibioticRationality(
      {
        drugName: '阿莫西林胶囊', hasIndication: true,
        dailyDoseMg: 1500, recommendedDoseMg: 2000, durationDays: 7,
        purpose: 'therapeutic',
      },
      basePatient,
      baseCulture,
    );
    expect(r.standard).toContain('国卫办医发');
  });
});

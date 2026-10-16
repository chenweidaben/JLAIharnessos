/**
 * 健澜科技 jlmedaios - 【护理院感医保药事】医院院感管理深化纯函数单测（M179-B）
 *
 * 覆盖：深度院感管理体系（四大维度）、手卫生监测（依从率）、
 *       暴发识别（72h 聚集 + 同源性）、周期院感报告（四类国家指标）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepInfectionMgmt,
  monitorHandHygiene,
  detectInfectionOutbreak,
  generateInfectionReport,
} from '../../src/bff/aggregators/infectionDeepAggregator';

/* ---------------------------------------------------------------------------
 * 0. 体系总览
 * ------------------------------------------------------------------------- */
describe('buildDeepInfectionMgmt - 四大管理维度', () => {
  it('返回四大维度且挂国家口径依据', () => {
    const sys = buildDeepInfectionMgmt();
    expect(sys.dimensions.length).toBe(4);
    expect(sys.nationalStandard).toContain('WS/T 313');
    expect(sys.guardrails.length).toBeGreaterThan(0);
    const names = sys.dimensions.map((d) => d.name);
    expect(names).toContain('院感监测');
    expect(names).toContain('院感病例');
    expect(names).toContain('暴发预警');
    expect(names).toContain('培训考核');
  });

  it('暴发预警维度含同源性与控制动作', () => {
    const out = buildDeepInfectionMgmt().dimensions.find((d) => d.code === 'outbreak');
    expect(out).toBeDefined();
    expect(out!.actions.join()).toContain('同源');
  });
});

/* ---------------------------------------------------------------------------
 * 1. 手卫生监测
 * ------------------------------------------------------------------------- */
describe('monitorHandHygiene - 手卫生依从率', () => {
  it('缺省走内置样例：200 次观察 178 次合格 → 89% 未达标', () => {
    const r = monitorHandHygiene('ICU', '2026-10');
    expect(r.observed).toBe(200);
    expect(r.compliant).toBe(178);
    expect(r.rate).toBe(89);
    expect(r.pass).toBe(false);
    expect(r.target).toBe('≥95%');
  });

  it('自定义统计：190/200 = 95% 即达标', () => {
    const r = monitorHandHygiene('呼吸内科', '2026-10', { observed: 200, compliant: 190 });
    expect(r.rate).toBe(95);
    expect(r.pass).toBe(true);
  });

  it('高依从率 198/200 = 99% 达标', () => {
    const r = monitorHandHygiene('全院', '2026-10', { observed: 200, compliant: 198 });
    expect(r.rate).toBe(99);
    expect(r.pass).toBe(true);
  });

  it('observed 为 0 安全返回 0 且不抛错', () => {
    const r = monitorHandHygiene('空科室', '2026-10', { observed: 0, compliant: 0 });
    expect(r.rate).toBe(0);
    expect(r.pass).toBe(false);
  });

  it('输出固定五时刻', () => {
    const r = monitorHandHygiene('ICU', '2026-10');
    expect(r.moments.length).toBe(5);
    expect(r.moments[0]).toBe('接触患者前');
  });
});

/* ---------------------------------------------------------------------------
 * 2. 暴发识别
 * ------------------------------------------------------------------------- */
describe('detectInfectionOutbreak - 72h 聚集 + 同源性', () => {
  it('三例同种同源 CRE → 聚集 且 暴发疑似', () => {
    const now = Date.now();
    const at = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
    const r = detectInfectionOutbreak('ICU', [
      { type: 'mdro', strain: 'CRE', at: at(1) },
      { type: 'mdro', strain: 'CRE', at: at(8) },
      { type: 'mdro', strain: 'CRE', at: at(20) },
    ], 3);
    expect(r.windowHours).toBe(72);
    expect(r.caseCount).toBe(3);
    expect(r.cluster).toBe(true);
    expect(r.homology).toBe('same');
    expect(r.outbreak).toBe(true);
    expect(r.controlAdvice.length).toBeGreaterThanOrEqual(4);
  });

  it('未达阈值（仅 2 例）→ 不聚集，按散发监测', () => {
    const now = Date.now();
    const at = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
    const r = detectInfectionOutbreak('ICU', [
      { type: 'mdro', strain: 'CRE', at: at(1) },
      { type: 'mdro', strain: 'CRE', at: at(8) },
    ], 3);
    expect(r.cluster).toBe(false);
    expect(r.outbreak).toBe(false);
    expect(r.alerts.some((a) => a.includes('散发'))).toBe(true);
  });

  it('聚集但菌株不同 → 不判暴发，仅提升监测', () => {
    const now = Date.now();
    const at = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
    const r = detectInfectionOutbreak('ICU', [
      { type: 'mdro', strain: 'CRE', at: at(1) },
      { type: 'mdro', strain: 'MRSA', at: at(8) },
      { type: 'mdro', strain: 'VRE', at: at(20) },
    ], 3);
    expect(r.cluster).toBe(true);
    expect(r.homology).toBe('different');
    expect(r.outbreak).toBe(false);
  });

  it('空输入安全返回散发基线', () => {
    const r = detectInfectionOutbreak('空科室', [], 3);
    expect(r.caseCount).toBe(0);
    expect(r.cluster).toBe(false);
    expect(r.outbreak).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
 * 3. 周期院感报告
 * ------------------------------------------------------------------------- */
describe('generateInfectionReport - 四类国家指标', () => {
  it('样例：8/800 手术 SSI = 1.0%，2/600 CLABSI = 3.33‰', () => {
    const rep = generateInfectionReport('2026-10');
    expect(rep.rates.ssiRatePercent).toBe(1.0);
    expect(rep.rates.clabsiPerMille).toBe(3.33);
    expect(rep.rates.vapPerMille).toBe(2.5);
    expect(rep.rates.mdroPerMille).toBe(2.0);
  });

  it('报告携带手卫生依从率与培训合格率', () => {
    const rep = generateInfectionReport('2026-10');
    expect(rep.handHygieneRate).toBe(89);
    expect(rep.trainingPassRate).toBe(92);
  });

  it('手卫生未达标时给出改进建议', () => {
    const rep = generateInfectionReport('2026-10');
    expect(rep.recommendations.some((x) => x.includes('手卫生'))).toBe(true);
    expect(rep.conclusion).toContain('SSI');
  });

  it('样例含一例聚集预警', () => {
    const rep = generateInfectionReport('2026-10');
    expect(rep.outbreakAlerts).toBe(1);
  });
});

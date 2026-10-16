/**
 * 健澜科技 jlmedaios - M176-C 手术麻醉管理深化聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 assessAnesthesiaRisk / trackIntraopMonitoring /
 * evaluateAnesthesiaQuality / buildDeepAnesthesiaMgmt。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepAnesthesiaMgmt,
  assessAnesthesiaRisk,
  trackIntraopMonitoring,
  evaluateAnesthesiaQuality,
  MAP_HYPO_THRESHOLD,
  SPO2_LOW_THRESHOLD,
  PACU_DELAY_MIN,
  type AnesthesiaPatient,
  type AnesthesiaSurgery,
  type IntraopMonitoringInput,
  type AnesthesiaOutcome,
} from '@/bff/aggregators/anesthesiaDeepAggregator';

const basePatient: AnesthesiaPatient = {
  patientRef: 'P-TEST',
  age: 40,
  comorbidities: [],
  asaGrade: 'I',
  cardiacFunction: 'normal',
  respiratoryFunction: 'normal',
};

const baseSurgery: AnesthesiaSurgery = {
  surgeryId: 'S-TEST',
  plannedProcedure: '腹股沟疝修补',
  department: '普外科',
  trauma: 'minor',
  plannedDurationMin: 45,
  bloodLossRisk: 'low',
  emergency: false,
};

describe('assessAnesthesiaRisk 麻醉风险评估', () => {
  it('ASA I + 无心肺合并症 + 小手术 = 低风险（low）', () => {
    const r = assessAnesthesiaRisk(basePatient, baseSurgery);
    expect(r.riskLevel).toBe('low');
    expect(r.riskScore).toBeLessThan(30);
    expect(r.requiredActions.length).toBeGreaterThan(0);
  });

  it('ASA IV + 心功能重度 + 急诊大手术 = 极高风险（extreme）', () => {
    const p: AnesthesiaPatient = {
      ...basePatient, age: 72, asaGrade: 'IV',
      cardiacFunction: 'severe', respiratoryFunction: 'moderate',
    };
    const s: AnesthesiaSurgery = {
      ...baseSurgery, trauma: 'major_plus', bloodLossRisk: 'high', emergency: true,
    };
    const r = assessAnesthesiaRisk(p, s);
    expect(r.riskLevel).toBe('extreme');
    expect(r.riskScore).toBeGreaterThanOrEqual(75);
    // 必须含整改项：心功能重度 / 高出血备血 / 急诊 RSI
    expect(r.requiredActions.some((a) => a.includes('心功能'))).toBe(true);
    expect(r.requiredActions.some((a) => a.includes('备血'))).toBe(true);
    expect(r.requiredActions.some((a) => a.includes('RSI'))).toBe(true);
  });

  it('风险分项守恒：riskScore = breakdown 各项之和', () => {
    const p: AnesthesiaPatient = { ...basePatient, asaGrade: 'III', cardiacFunction: 'moderate', respiratoryFunction: 'mild', age: 65 };
    const s: AnesthesiaSurgery = { ...baseSurgery, trauma: 'major', emergency: false };
    const r = assessAnesthesiaRisk(p, s);
    const sum = r.breakdown.asa + r.breakdown.cardiac + r.breakdown.respiratory
      + r.breakdown.age + r.breakdown.trauma + r.breakdown.emergency;
    expect(r.riskScore).toBe(Math.min(100, sum));
  });

  it('重度肺功能差建议气管插管全麻', () => {
    const p: AnesthesiaPatient = { ...basePatient, respiratoryFunction: 'severe' };
    const r = assessAnesthesiaRisk(p, { ...baseSurgery, trauma: 'major' });
    expect(r.suggestedAnesthesia).toContain('肺保护性通气');
  });
});

describe('trackIntraopMonitoring 术中监测跟踪', () => {
  const stableInput: IntraopMonitoringInput = {
    vitals: [
      { t: 0, hr: 72, sbp: 120, dbp: 78, spo2: 99, etco2: 35, bis: 50 },
      { t: 30, hr: 74, sbp: 118, dbp: 76, spo2: 98, etco2: 36, bis: 48 },
    ],
    events: [],
    estimatedBloodLossMl: 50,
    estimatedBloodVolumeMl: 5000,
  };

  it('平稳手术 = 无告警、stable=true', () => {
    const t = trackIntraopMonitoring('S-1', stableInput);
    expect(t.alertCount).toBe(0);
    expect(t.stable).toBe(true);
    expect(t.sampleCount).toBe(2);
  });

  it('MAP<60 检出低血压告警', () => {
    const lowBp: IntraopMonitoringInput = {
      ...stableInput,
      vitals: [{ t: 10, hr: 90, sbp: 80, dbp: 45, spo2: 99, etco2: 35, bis: 50 }],
    };
    const t = trackIntraopMonitoring('S-2', lowBp);
    expect(t.alerts.some((a) => a.kind === 'hypotension')).toBe(true);
    expect(t.minMap).toBeLessThan(MAP_HYPO_THRESHOLD);
  });

  it('SpO2<95 检出低氧告警', () => {
    const hypox: IntraopMonitoringInput = {
      ...stableInput,
      vitals: [{ t: 10, hr: 80, sbp: 120, dbp: 78, spo2: 92, etco2: 40, bis: 50 }],
    };
    const t = trackIntraopMonitoring('S-3', hypox);
    expect(t.alerts.some((a) => a.kind === 'hypoxia')).toBe(true);
    expect(t.minSpo2).toBeLessThan(SPO2_LOW_THRESHOLD);
  });

  it('BIS<40 过深 / BIS>60 过浅 均检出', () => {
    const deep: IntraopMonitoringInput = {
      ...stableInput,
      vitals: [{ t: 5, hr: 70, sbp: 110, dbp: 70, spo2: 99, bis: 35 }],
    };
    expect(trackIntraopMonitoring('S-4', deep).alerts.some((a) => a.kind === 'deep_sedation')).toBe(true);

    const light: IntraopMonitoringInput = {
      ...stableInput,
      vitals: [{ t: 5, hr: 80, sbp: 125, dbp: 80, spo2: 99, bis: 65 }],
    };
    expect(trackIntraopMonitoring('S-5', light).alerts.some((a) => a.kind === 'light_sedation')).toBe(true);
  });

  it('出血量 > 血容量 20% 检出大出血告警', () => {
    const bleed: IntraopMonitoringInput = {
      ...stableInput,
      estimatedBloodLossMl: 1200,
      estimatedBloodVolumeMl: 5000, // 24%
    };
    const t = trackIntraopMonitoring('S-6', bleed);
    expect(t.alerts.some((a) => a.kind === 'major_bleeding')).toBe(true);
    expect(t.bloodLossPct).toBeGreaterThan(0.2);
  });
});

describe('evaluateAnesthesiaQuality 麻醉质量评价', () => {
  const perfect: AnesthesiaOutcome = {
    anesthesiaComplication: false, unplannedReintubation: false, anesthesiaDeath: false,
    pacuStayMin: 40, aldreteAtDischarge: 10, painScoreNrs: 2, postopComplications: [],
  };

  it('无并发症 + Aldrete 满分 = excellent', () => {
    const q = evaluateAnesthesiaQuality('S-1', perfect);
    expect(q.grade).toBe('excellent');
    expect(q.score).toBe(100);
    expect(q.painControlled).toBe(true);
  });

  it('麻醉并发症 + 二次插管 + PACU 延迟 = poor', () => {
    const bad: AnesthesiaOutcome = {
      anesthesiaComplication: true, unplannedReintubation: true, anesthesiaDeath: false,
      pacuStayMin: 200, aldreteAtDischarge: 7, painScoreNrs: 6,
      postopComplications: ['resp_depression'],
    };
    const q = evaluateAnesthesiaQuality('S-2', bad);
    expect(q.grade).toBe('poor');
    expect(q.pacuDelay).toBe(true);
    expect(q.painControlled).toBe(false);
    expect(q.flags.some((f) => f.includes('非计划二次插管'))).toBe(true);
  });

  it('麻醉死亡直接扣到 0 分', () => {
    const dead: AnesthesiaOutcome = { ...perfect, anesthesiaDeath: true };
    const q = evaluateAnesthesiaQuality('S-3', dead);
    expect(q.score).toBe(0);
    expect(q.grade).toBe('poor');
  });

  it('PACU 滞留 > 120min 判延迟', () => {
    const delayed: AnesthesiaOutcome = { ...perfect, pacuStayMin: PACU_DELAY_MIN + 30 };
    expect(evaluateAnesthesiaQuality('S-4', delayed).pacuDelay).toBe(true);
  });
});

describe('buildDeepAnesthesiaMgmt 深度看板总装', () => {
  it('返回四维汇总且 demo=true', () => {
    const m = buildDeepAnesthesiaMgmt();
    expect(m.demo).toBe(true);
    expect(m.preop.totalCases).toBeGreaterThan(0);
    // ASA 分布求和 = 总例数
    const asaSum = Object.values(m.preop.asaDistribution).reduce((a, b) => a + b, 0);
    expect(asaSum).toBe(m.preop.totalCases);
    // 风险分布求和 = 总例数
    const riskSum = Object.values(m.preop.riskDistribution).reduce((a, b) => a + b, 0);
    expect(riskSum).toBe(m.preop.totalCases);
    // 术中 traces 数 = 总例数
    expect(m.intraop.traces.length).toBe(m.preop.totalCases);
    // quality 评价数 = 总例数
    expect(m.quality.evaluations.length).toBe(m.preop.totalCases);
  });

  it('质量率在 [0,100] 区间且与例数一致', () => {
    const m = buildDeepAnesthesiaMgmt();
    expect(m.quality.complicationRate).toBeGreaterThanOrEqual(0);
    expect(m.quality.complicationRate).toBeLessThanOrEqual(100);
    expect(m.quality.mortalityRate).toBeGreaterThanOrEqual(0);
    expect(m.quality.unplannedReintubationRate).toBeGreaterThanOrEqual(0);
    // 高危案例非空（含 ASA IV 急诊）
    expect(m.preop.highRiskCases.length).toBeGreaterThan(0);
  });
});

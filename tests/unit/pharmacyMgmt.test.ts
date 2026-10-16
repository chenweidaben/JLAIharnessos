/**
 * 健澜科技 jlmedaios — 【护理院感医保药事】医院药事管理深化纯函数单测（M179-D）
 *
 * 覆盖：
 *  - buildDeepPharmacyMgmt（四维盘点 + 控制点 + 安全红线 + 成熟度）；
 *  - auditPrescriptionQuality（妊娠禁忌 / 儿童慎用 / 重复用药 / 联用禁忌 / 超量）；
 *  - monitorDrugUse（DDDs / 金额占比 / 围手术期使用率 / 特殊级预警）；
 *  - generatePharmacyReport（周期 KPI / 评级 / 改进建议）。
 * 与持久化解耦，不触库，不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  auditPrescriptionQuality,
  buildDeepPharmacyMgmt,
  generatePharmacyReport,
  monitorDrugUse,
  type PrescriptionSnapshot,
} from '../../src/bff/aggregators/pharmacyMgmtAggregator';

describe('buildDeepPharmacyMgmt（采购/库存/使用/质量四维度）', () => {
  it('四大维度齐全，且每个维度控制点 ≥ 3 个', () => {
    const r = buildDeepPharmacyMgmt();
    expect(r.pillars.map((p) => p.code)).toEqual([
      'procurement', 'inventory', 'medication', 'quality',
    ]);
    for (const p of r.pillars) {
      expect(p.controlPoints.length).toBeGreaterThanOrEqual(3);
      expect(p.guardrails.length).toBeGreaterThanOrEqual(2);
      expect(p.target.length).toBeGreaterThan(0);
    }
  });

  it('成熟度在 0..100 之间，全局红线含 ADR 24h 上报', () => {
    const r = buildDeepPharmacyMgmt();
    expect(r.maturityScore).toBeGreaterThan(0);
    expect(r.maturityScore).toBeLessThanOrEqual(100);
    expect(r.globalGuardrails.join('')).toContain('24h');
    expect(r.valueStatement).toContain('差错');
  });

  it('冷链药品双人复核（验收控制点 dualSignRequired=true）', () => {
    const r = buildDeepPharmacyMgmt();
    const accept = r.pillars.find((p) => p.code === 'procurement');
    expect(accept).toBeDefined();
    const cp = accept!.controlPoints.find((c) => c.code === 'accept');
    expect(cp).toBeDefined();
    expect(cp!.dualSignRequired).toBe(true);
  });
});

describe('auditPrescriptionQuality（处方点评：不合理闭环）', () => {
  it('全部合理处方 → 不合理率 0，无需反馈', () => {
    const rx: PrescriptionSnapshot[] = [
      {
        prescriptionId: 'RX-001',
        patientId: 'P-001',
        prescriberId: 'MD-001',
        prescriberName: '王医生',
        department: '呼吸内科',
        drugNames: ['阿莫西林胶囊'],
        doseMg: 500,
        frequencyPerDay: 3,
        route: 'oral',
        diagnosis: '细菌性肺炎',
        patientAge: 45,
      },
    ];
    const r = auditPrescriptionQuality(rx);
    expect(r.totalPrescriptions).toBe(1);
    expect(r.irrationalCount).toBe(0);
    expect(r.irrationalRatePct).toBe(0);
    expect(r.feedbackList.length).toBe(0);
  });

  it('妊娠患者开利巴韦林 → 判定 interaction 不合理', () => {
    const rx: PrescriptionSnapshot[] = [
      {
        prescriptionId: 'RX-002',
        patientId: 'P-002',
        prescriberId: 'MD-002',
        prescriberName: '李医生',
        department: '妇产科',
        drugNames: ['利巴韦林颗粒'],
        doseMg: 100,
        frequencyPerDay: 3,
        route: 'oral',
        diagnosis: '上呼吸道感染',
        patientAge: 28,
        pregnant: true,
      },
    ];
    const r = auditPrescriptionQuality(rx);
    expect(r.irrationalCount).toBe(1);
    expect(r.results[0].irrationalTypes).toContain('interaction');
    expect(r.results[0].feedbackRequired).toBe(true);
    expect(r.feedbackList[0].prescriberId).toBe('MD-002');
  });

  it('<3 岁儿童开阿司匹林 → 判定 dosage 不合理', () => {
    const rx: PrescriptionSnapshot[] = [
      {
        prescriptionId: 'RX-003',
        patientId: 'P-003',
        prescriberId: 'MD-003',
        prescriberName: '赵医生',
        department: '儿科',
        drugNames: ['阿司匹林肠溶片'],
        doseMg: 100,
        frequencyPerDay: 1,
        route: 'oral',
        diagnosis: '发热待查',
        patientAge: 2,
      },
    ];
    const r = auditPrescriptionQuality(rx);
    expect(r.irrationalCount).toBe(1);
    expect(r.results[0].irrationalTypes).toContain('dosage');
  });

  it('同通用名重复用药（阿莫西林胶囊 + 阿莫西林颗粒）→ duplication', () => {
    const rx: PrescriptionSnapshot[] = [
      {
        prescriptionId: 'RX-004',
        patientId: 'P-004',
        prescriberId: 'MD-004',
        prescriberName: '钱医生',
        department: '全科',
        drugNames: ['阿莫西林胶囊', '阿莫西林颗粒'],
        doseMg: 250,
        frequencyPerDay: 3,
        route: 'oral',
        diagnosis: '扁桃体炎',
        patientAge: 35,
      },
    ];
    const r = auditPrescriptionQuality(rx);
    expect(r.irrationalCount).toBe(1);
    expect(r.results[0].irrationalTypes).toContain('duplication');
  });

  it('联用禁忌（ACEI + ARB）→ interaction', () => {
    const rx: PrescriptionSnapshot[] = [
      {
        prescriptionId: 'RX-005',
        patientId: 'P-005',
        prescriberId: 'MD-005',
        prescriberName: '孙医生',
        department: '心内科',
        drugNames: ['依那普利片', '缬沙坦胶囊'],
        doseMg: 10,
        frequencyPerDay: 2,
        route: 'oral',
        diagnosis: '高血压',
        patientAge: 60,
      },
    ];
    const r = auditPrescriptionQuality(rx);
    expect(r.irrationalCount).toBe(1);
    expect(r.results[0].irrationalTypes).toContain('interaction');
  });

  it('同一医师 ≥3 张不合理 → 进入约谈清单', () => {
    const mk = (id: string): PrescriptionSnapshot => ({
      prescriptionId: id,
      patientId: 'P-X',
      prescriberId: 'MD-BAD',
      prescriberName: '坏医生',
      department: '内科',
      drugNames: ['利巴韦林颗粒'],
      doseMg: 100,
      frequencyPerDay: 3,
      route: 'oral',
      diagnosis: '感冒',
      patientAge: 30,
      pregnant: true,
    });
    const r = auditPrescriptionQuality([mk('RX-A'), mk('RX-B'), mk('RX-C')]);
    expect(r.irrationalCount).toBe(3);
    expect(r.interviewList.length).toBe(1);
    expect(r.interviewList[0].irrationalCount).toBe(3);
  });

  it('空处方列表 → 不合理率 0，不报错', () => {
    const r = auditPrescriptionQuality([]);
    expect(r.totalPrescriptions).toBe(0);
    expect(r.irrationalRatePct).toBe(0);
  });
});

describe('monitorDrugUse（用药监测：DDDs / 异常预警）', () => {
  it('返回 DDDs / 金额占比 / 预警级别，且周期收敛到 1..365', () => {
    const r = monitorDrugUse('D-AMOX-001', 30);
    expect(r.drugId).toBe('D-AMOX-001');
    expect(r.periodDays).toBe(30);
    expect(r.ddds).toBeGreaterThan(0);
    expect(r.costSharePct).toBeGreaterThan(0);
    expect(r.alerts.length).toBeGreaterThan(0);
    expect(['none', 'info', 'warning', 'critical']).toContain(r.alertLevel);
  });

  it('周期越界收敛（0 → 7，99999 → 365）', () => {
    expect(monitorDrugUse('D-001', 0).periodDays).toBe(7);
    expect(monitorDrugUse('D-001', 99999).periodDays).toBe(365);
    expect(monitorDrugUse('D-001', -5).periodDays).toBe(1);
  });

  it('同一 drugId 多次调用结果一致（纯函数确定性）', () => {
    const a = monitorDrugUse('D-UNIQUE-123', 14);
    const b = monitorDrugUse('D-UNIQUE-123', 14);
    expect(a.prescriptionCount).toBe(b.prescriptionCount);
    expect(a.ddds).toBe(b.ddds);
    expect(a.costSharePct).toBe(b.costSharePct);
  });
});

describe('generatePharmacyReport（周期药事报告）', () => {
  it('四维 KPI 齐全，综合得分 0..100，评级 A/B/C/D', () => {
    const r = generatePharmacyReport('2026-Q4');
    expect(r.period).toBe('2026-Q4');
    expect(r.pillars.length).toBe(4);
    expect(r.overallScore).toBeGreaterThan(0);
    expect(r.overallScore).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D']).toContain(r.grade);
  });

  it('摘要五指标齐全：四单匹配/账实相符/不合理率/ADR及时/整改完成', () => {
    const r = generatePharmacyReport('2026-Q4');
    expect(typeof r.summary.acceptanceMatchRatePct).toBe('number');
    expect(typeof r.summary.inventoryAccuracyPct).toBe('number');
    expect(typeof r.summary.prescriptionIrrationalRatePct).toBe('number');
    expect(typeof r.summary.adrReportTimelyRatePct).toBe('number');
    expect(typeof r.summary.rectificationRatePct).toBe('number');
  });

  it('改进建议非空（指标达标时也给出维持建议）', () => {
    const r = generatePharmacyReport('2026-Q4');
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it('同一 period 多次调用结果一致（纯函数确定性）', () => {
    const a = generatePharmacyReport('2026-Q4');
    const b = generatePharmacyReport('2026-Q4');
    expect(a.summary).toEqual(b.summary);
    expect(a.overallScore).toBe(b.overallScore);
    expect(a.grade).toBe(b.grade);
  });

  it('空 period 回退默认，不报错', () => {
    const r = generatePharmacyReport('');
    expect(r.period.length).toBeGreaterThan(0);
  });
});

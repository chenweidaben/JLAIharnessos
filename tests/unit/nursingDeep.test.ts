/**
 * 健澜科技 jlmedaios - M179-A 医院护理管理深化聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 calculateNursingRatio（床护比）/
 * identifyNursingRisk（风险识别）/ generateNursingQualityReport（质量报告）/
 * buildDeepNursingMgmt（护理管理驾驶舱）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepNursingMgmt,
  calculateNursingRatio,
  generateNursingQualityReport,
  identifyNursingRisk,
  NURSING_RATIO_STANDARD,
  OVERTIME_CARE_LIMIT_HOURS,
  type RiskPatient,
} from '@/bff/aggregators/nursingDeepAggregator';

describe('calculateNursingRatio 床护比计算', () => {
  it('普通病房：每护士分管数 / 应配护士数 / 状态正确', () => {
    // 42 床 / 6 护士，普通病房标准 8 人/班 → 每人 7.0，应配 ceil(42/8)=6
    const r = calculateNursingRatio('GEN-01', 42, 6);
    expect(r.wardType).toBe('general');
    expect(r.standardMaxPerNurse).toBe(NURSING_RATIO_STANDARD.general); // 8
    expect(r.patientsPerNurse).toBeCloseTo(7.0, 2);
    expect(r.requiredNurses).toBe(6);
    expect(r.nurseShortage).toBe(0);
    expect(r.status).toBe('abundant');
    expect(r.careSuggestion).toContain('轮休与培训');
  });

  it('人力偏紧：80 床仅 5 护士 → understaffed，建议补位而非加班', () => {
    const r = calculateNursingRatio('GEN-09', 80, 5);
    expect(r.patientsPerNurse).toBeCloseTo(16, 2);
    expect(r.requiredNurses).toBe(10); // ceil(80/8)
    expect(r.nurseShortage).toBe(5);
    expect(r.status).toBe('understaffed');
    expect(r.careSuggestion).toContain('建议增补 5 名护士');
  });

  it('ICU 标准更严：12 床 / 8 护士，标准 2.5 人/班', () => {
    const r = calculateNursingRatio('ICU-01', 12, 8);
    expect(r.wardType).toBe('icu');
    expect(r.standardMaxPerNurse).toBe(2.5);
    expect(r.patientsPerNurse).toBeCloseTo(1.5, 2);
    expect(r.status).toBe('abundant');
  });

  it('零护士零患者不除零；缺人时给关怀建议', () => {
    const r = calculateNursingRatio('GEN-X', 0, 0);
    expect(r.patientsPerNurse).toBe(0);
    expect(r.requiredNurses).toBe(0);
    const r2 = calculateNursingRatio('GEN-X', 20, 0);
    expect(r2.status).toBe('understaffed');
  });
});

describe('identifyNursingRisk 护理风险识别', () => {
  const patients: RiskPatient[] = [
    { id: 'P-001', age: 78, bradenScore: 11, fallRisk: 'high', impairedConsciousness: false, hasTube: false, critical: false },
    { id: 'P-002', age: 64, bradenScore: 15, fallRisk: 'low', impairedConsciousness: true, hasTube: true, critical: false },
    { id: 'P-003', age: 55, bradenScore: 20, fallRisk: 'low', impairedConsciousness: false, hasTube: false, critical: false },
    { id: 'P-004', age: 71, bradenScore: 13, fallRisk: 'medium', impairedConsciousness: false, hasTube: true, critical: true },
  ];

  it('高危/中危/低危计数正确，输出关怀动作而非监控', () => {
    const rep = identifyNursingRisk('GEN-01', patients);
    expect(rep.totalPatients).toBe(4);
    // P-001(Braden≤12+跌倒高)、P-002(意识障碍)、P-004(危重) → 高危 3
    expect(rep.highCount).toBe(3);
    expect(rep.lowCount).toBe(1);
    expect(rep.mediumCount).toBe(0);
    expect(rep.staffingNote).toContain('高年资护士');
  });

  it('Braden ≤12 命中压疮高危并给出翻身/减压动作', () => {
    const rep = identifyNursingRisk('GEN-01', patients);
    const p1 = rep.patients.find((p) => p.patientId === 'P-001');
    expect(p1?.level).toBe('high');
    expect(p1?.factors.join('、')).toContain('压疮高危');
    expect(p1?.careActions.join('；')).toContain('翻身');
  });

  it('空患者列表不报错', () => {
    const rep = identifyNursingRisk('GEN-01', []);
    expect(rep.totalPatients).toBe(0);
    expect(rep.highCount).toBe(0);
  });
});

describe('generateNursingQualityReport 护理质量报告', () => {
  it('合格率 / 不良事件 / 根因分析率 / 培训 / 科研字段齐全', () => {
    const rep = generateNursingQualityReport('2026Q3');
    expect(rep.period).toBe('2026Q3');
    // 三基 38/40 = 0.95；专科技能 22/24 ≈ 0.917
    expect(rep.basicCarePassRate).toBeCloseTo(0.95, 2);
    expect(rep.criticalCarePassRate).toBeCloseTo(0.917, 2);
    expect(rep.adverseEventCount).toBe(3);
    expect(rep.rcaDoneRate).toBeCloseTo(1.0, 2);
    expect(rep.training.emergencyDrills).toBe(1);
    expect(rep.research.papers).toBe(1);
    expect(rep.research.patents).toBe(1);
    expect(rep.research.qualityControlCircles).toBe(1);
    expect(rep.summary).toContain('根因分析');
  });

  it('未知周期回退为空台账，不抛错', () => {
    const rep = generateNursingQualityReport('2030Q1');
    expect(rep.basicCarePassRate).toBe(0);
    expect(rep.research.papers).toBe(0);
  });
});

describe('buildDeepNursingMgmt 护理管理驾驶舱', () => {
  it('排班汇总守恒、加班关怀阈值生效、含关怀主张', () => {
    const view = buildDeepNursingMgmt();
    expect(view.demo).toBe(true);
    expect(view.careCharter).toContain('真关心护士');
    // 4 病区：患者 42+38+12+24=116；护士 6+5+8+4=23
    expect(view.scheduling.totalPatients).toBe(116);
    expect(view.scheduling.totalNurses).toBe(23);
    expect(view.scheduling.wards).toHaveLength(4);
    expect(view.scheduling.overtimeCareLimitHours).toBe(OVERTIME_CARE_LIMIT_HOURS);
    // GEN-02 加班 41h > 36h → 一个加班关怀提醒
    expect(view.scheduling.overtimeAlertCount).toBe(1);
    const gen02 = view.scheduling.wards.find((w) => w.ward === 'GEN-02');
    expect(gen02?.overtimeAlert).toBe(true);
    expect(gen02?.overtimeNote).toContain('调休');
  });
});

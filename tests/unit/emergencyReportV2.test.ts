/**
 * 健澜科技 jlmedaios - 急诊管理纯函数单测（M190-D V2）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildEmergencyReport,
  classifyEmergencyTriage,
  predictEmergencyResourceNeed,
  type EmergencyPatientV2,
} from '../../src/bff/aggregators/emergencyReportV2Aggregator';

describe('classifyEmergencyTriage', () => {
  it('休克 → I 级', () => {
    const p: EmergencyPatientV2 = {
      vitalSigns: { systolicBp: 70, heartRate: 150, respRate: 30, spo2: 80, consciousness: 'unresponsive' },
      chiefComplaint: '休克',
    };
    expect(classifyEmergencyTriage(p)).toBe('I');
  });

  it('胸痛 → II 级', () => {
    const p: EmergencyPatientV2 = {
      vitalSigns: { systolicBp: 110, heartRate: 110, respRate: 20, spo2: 95, consciousness: 'alert' },
      chiefComplaint: '胸痛',
    };
    expect(classifyEmergencyTriage(p)).toBe('II');
  });

  it('意识模糊 → III 级', () => {
    const p: EmergencyPatientV2 = {
      vitalSigns: { systolicBp: 115, heartRate: 80, respRate: 18, spo2: 97, consciousness: 'verbal' },
      chiefComplaint: '头晕',
    };
    expect(classifyEmergencyTriage(p)).toBe('III');
  });

  it('轻症 → IV 级', () => {
    const p: EmergencyPatientV2 = {
      vitalSigns: { systolicBp: 120, heartRate: 70, respRate: 16, spo2: 99, consciousness: 'alert' },
      chiefComplaint: '普通感冒',
    };
    expect(classifyEmergencyTriage(p)).toBe('IV');
  });
});

describe('predictEmergencyResourceNeed', () => {
  it('按比例预测各级别占比', () => {
    const records = [
      { arrivalHour: 9, triage: 'I' as const },
      { arrivalHour: 9, triage: 'II' as const },
      { arrivalHour: 10, triage: 'II' as const },
      { arrivalHour: 10, triage: 'III' as const },
      { arrivalHour: 11, triage: 'III' as const },
      { arrivalHour: 11, triage: 'III' as const },
      { arrivalHour: 12, triage: 'IV' as const },
      { arrivalHour: 12, triage: 'IV' as const },
      { arrivalHour: 13, triage: 'IV' as const },
      { arrivalHour: 13, triage: 'IV' as const },
    ];
    const r = predictEmergencyResourceNeed(records);
    expect(r.predictedI).toBe(0.1);
    expect(r.predictedII).toBe(0.2);
    expect(r.predictedIII).toBe(0.3);
    expect(r.predictedIV).toBe(0.4);
  });

  it('推荐床位 = 30% 取上整', () => {
    const records = [
      { arrivalHour: 9, triage: 'I' as const },
      { arrivalHour: 10, triage: 'II' as const },
    ];
    const r = predictEmergencyResourceNeed(records);
    expect(r.recommendedBeds).toBe(1);
  });

  it('空列表 → 0', () => {
    const r = predictEmergencyResourceNeed([]);
    expect(r.recommendedBeds).toBe(0);
  });
});

describe('buildEmergencyReport', () => {
  it('生成急诊量', () => {
    const r = buildEmergencyReport('急诊科', '30d');
    expect(r.totalVisits).toBeGreaterThan(0);
  });

  it('生成分诊分布', () => {
    const r = buildEmergencyReport('急诊科', '30d');
    expect(r.triageDistribution.length).toBe(4);
  });

  it('生成预警', () => {
    const r = buildEmergencyReport('急诊科', '30d');
    expect(r.alerts.length).toBeGreaterThan(0);
  });
});

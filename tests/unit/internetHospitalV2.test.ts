/**
 * 健澜科技 jlmedaios - 互联网医院深化纯函数单测 V2（M195-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildInternetHospitalReportV2,
  classifyOnlineConsultation,
  predictInternetHospitalTrend,
  type OnlinePatient,
  type TrendData,
} from '../../src/bff/aggregators/internetHospitalV2Aggregator';

describe('classifyOnlineConsultation', () => {
  it('慢病 → 慢病管理', () => {
    const patient: OnlinePatient = { hasPreviousDiagnosis: true, isChronicDisease: true, symptomDuration: 30 };
    expect(classifyOnlineConsultation(patient)).toBe('chronic_management');
  });

  it('有诊断+症状久 → 复诊', () => {
    const patient: OnlinePatient = { hasPreviousDiagnosis: true, isChronicDisease: false, symptomDuration: 14 };
    expect(classifyOnlineConsultation(patient)).toBe('followup');
  });

  it('无诊断 → 初诊', () => {
    const patient: OnlinePatient = { hasPreviousDiagnosis: false, isChronicDisease: false, symptomDuration: 3 };
    expect(classifyOnlineConsultation(patient)).toBe('first_visit');
  });
});

describe('predictInternetHospitalTrend', () => {
  it('高增长 → high', () => {
    const data: TrendData = { mau: 50000, growthRate: 0.15 };
    const r = predictInternetHospitalTrend(data);
    expect(r.growth).toBe('high');
    expect(r.nextMonthMAU).toBeGreaterThan(50000);
  });
});

describe('buildInternetHospitalReportV2', () => {
  it('生成问诊数据', () => {
    const r = buildInternetHospitalReportV2('30d');
    expect(r.consultation.text).toBeGreaterThan(0);
  });

  it('生成合规数据', () => {
    const r = buildInternetHospitalReportV2('30d');
    expect(r.compliance.firstVisitBanned).toBe(true);
  });

  it('生成运营数据', () => {
    const r = buildInternetHospitalReportV2('30d');
    expect(r.operations.mau).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInternetHospitalReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

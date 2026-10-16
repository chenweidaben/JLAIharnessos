/**
 * 健澜科技 jlmedaios - 智慧医院评价纯函数单测（M210-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildSmartHospitalReport,
  identifySmartHospitalGaps,
  scoreSmartHospital,
  type SmartHospitalCriteria,
} from '../../src/bff/aggregators/smartHospitalReportAggregator';

describe('scoreSmartHospital', () => {
  it('三维各 95 → 285 五星级', () => {
    const c: SmartHospitalCriteria = { smartMedical: 95, smartService: 95, smartManagement: 95 };
    const r = scoreSmartHospital(c);
    expect(r.total).toBe(285);
    expect(r.level).toBe('五星级');
  });

  it('三维各 60 → 180 未达标', () => {
    const c: SmartHospitalCriteria = { smartMedical: 60, smartService: 60, smartManagement: 60 };
    const r = scoreSmartHospital(c);
    expect(r.level).toBe('未达标');
  });
});

describe('identifySmartHospitalGaps', () => {
  it('智慧管理 75 → 差距项含智慧管理', () => {
    const c: SmartHospitalCriteria = { smartMedical: 95, smartService: 95, smartManagement: 75 };
    const gaps = identifySmartHospitalGaps(c);
    expect(gaps).toContain('智慧管理不足');
  });

  it('全 95 → 无差距', () => {
    const c: SmartHospitalCriteria = { smartMedical: 95, smartService: 95, smartManagement: 95 };
    const gaps = identifySmartHospitalGaps(c);
    expect(gaps.length).toBe(0);
  });
});

describe('buildSmartHospitalReport', () => {
  it('生成三位一体数据', () => {
    const r = buildSmartHospitalReport('30d');
    expect(r.triad.smartMedical).toBeGreaterThan(0);
  });

  it('生成体验数据', () => {
    const r = buildSmartHospitalReport('30d');
    expect(r.patientExperience.nps).toBeGreaterThan(0);
  });

  it('生成准备数据', () => {
    const r = buildSmartHospitalReport('30d');
    expect(r.readiness.selfAssessment).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildSmartHospitalReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

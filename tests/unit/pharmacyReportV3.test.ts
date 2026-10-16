/**
 * 健澜科技 jlmedaios - 药房 V3 纯函数单测（M204-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessAntibioticUse,
  buildPharmacyReportV3,
  checkPrescriptionSafety,
  type PrescriptionData,
} from '../../src/bff/aggregators/pharmacyReportV3Aggregator';

describe('checkPrescriptionSafety', () => {
  it('老年大剂量 → 警告', () => {
    const rx: PrescriptionData = { drugName: '布洛芬', doseMg: 800, frequency: 'qd', patientAge: 70, liverDysfunction: false };
    const r = checkPrescriptionSafety(rx);
    expect(r.safe).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('常规处方 → 安全', () => {
    const rx: PrescriptionData = { drugName: '维生素C', doseMg: 100, frequency: 'qd', patientAge: 30, liverDysfunction: false };
    const r = checkPrescriptionSafety(rx);
    expect(r.safe).toBe(true);
  });
});

describe('assessAntibioticUse', () => {
  it('DDD 25 → 合理', () => {
    const r = assessAntibioticUse(25);
    expect(r.level).toBe('合理');
    expect(r.target).toBe(true);
  });

  it('DDD 50 → 超标', () => {
    const r = assessAntibioticUse(50);
    expect(r.level).toBe('超标');
  });
});

describe('buildPharmacyReportV3', () => {
  it('生成门诊数据', () => {
    const r = buildPharmacyReportV3('30d');
    expect(r.outpatient.prescriptions).toBeGreaterThan(0);
  });

  it('生成PIVAS数据', () => {
    const r = buildPharmacyReportV3('30d');
    expect(r.pivas.admixtures).toBeGreaterThan(0);
  });

  it('生成ADR数据', () => {
    const r = buildPharmacyReportV3('30d');
    expect(r.adr.reported).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPharmacyReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

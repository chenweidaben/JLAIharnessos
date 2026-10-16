/**
 * 健澜科技 jlmedaios - 智能预警 V2 纯函数单测（M208-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessVTERisk,
  buildSmartAlertReportV2,
  calculateMEWS,
  type VitalSigns,
  type VTEHistory,
} from '../../src/bff/aggregators/smartAlertReportV2Aggregator';

describe('calculateMEWS', () => {
  it('低血压+意识差 → 高危', () => {
    const v: VitalSigns = { systolicBp: 60, heartRate: 130, respiration: 35, temperature: 39, consciousness: 5 };
    const r = calculateMEWS(v);
    expect(r.level).toBe('高危');
  });

  it('正常 → 低危', () => {
    const v: VitalSigns = { systolicBp: 120, heartRate: 80, respiration: 16, temperature: 36.5, consciousness: 15 };
    const r = calculateMEWS(v);
    expect(r.level).toBe('低危');
  });
});

describe('assessVTERisk', () => {
  it('既往 DVT+手术+肿瘤+高龄 → 高危', () => {
    const h: VTEHistory = { previousDVT: true, surgery: true, malignancy: true, age: 70 };
    const r = assessVTERisk(h);
    expect(r.riskLevel).toBe('高危');
  });

  it('无危险因素 → 低危', () => {
    const h: VTEHistory = { previousDVT: false, surgery: false, malignancy: false, age: 40 };
    const r = assessVTERisk(h);
    expect(r.riskLevel).toBe('低危');
  });
});

describe('buildSmartAlertReportV2', () => {
  it('生成MEWS数据', () => {
    const r = buildSmartAlertReportV2('30d');
    expect(r.mews.alerts).toBeGreaterThan(0);
  });

  it('生成危急值数据', () => {
    const r = buildSmartAlertReportV2('30d');
    expect(r.criticalValue.total).toBeGreaterThan(0);
  });

  it('生成院感数据', () => {
    const r = buildSmartAlertReportV2('30d');
    expect(r.infection.vap).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildSmartAlertReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

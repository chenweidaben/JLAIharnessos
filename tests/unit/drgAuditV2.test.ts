/**
 * 健澜科技 jlmedaios - DRG 智能审核 V2 纯函数单测（M187-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDRGAuditReport,
  detectHighCoding,
  predictRejectionRisk,
  type DRGRecord,
} from '../../src/bff/aggregators/drgAuditV2Aggregator';

const normalRecord: DRGRecord = {
  recordId: 'rec-normal',
  primaryDiagnosis: '糖尿病',
  secondaryDiagnoses: [],
  procedures: [],
  hospitalDays: 5,
  totalCost: 8000,
  expectedDRGWeight: 0.8,
  actualDRGWeight: 0.85,
};

describe('detectHighCoding', () => {
  it('DRG 权重远高于预期 → high 高套', () => {
    const rec: DRGRecord = { ...normalRecord, recordId: 'rec-1', expectedDRGWeight: 1.0, actualDRGWeight: 2.0 };
    const alerts = detectHighCoding([rec]);
    expect(alerts.some((a) => a.severity === 'high')).toBe(true);
  });

  it('住院日 ≤2 天且费用 >1 万 → medium 低标入院', () => {
    const rec: DRGRecord = { ...normalRecord, recordId: 'rec-2', hospitalDays: 1, totalCost: 15000 };
    const alerts = detectHighCoding([rec]);
    expect(alerts.some((a) => a.reason.includes('低标入院'))).toBe(true);
  });

  it('正常病案无告警', () => {
    const alerts = detectHighCoding([normalRecord]);
    expect(alerts.length).toBe(0);
  });
});

describe('predictRejectionRisk', () => {
  it('DRG 权重异常偏高 → high', () => {
    const rec: DRGRecord = { ...normalRecord, expectedDRGWeight: 1.0, actualDRGWeight: 2.0 };
    expect(predictRejectionRisk(rec).risk).toBe('high');
  });

  it('住院日过短 → medium', () => {
    const rec: DRGRecord = { ...normalRecord, hospitalDays: 1 };
    expect(predictRejectionRisk(rec).risk).toBe('medium');
  });

  it('正常病案 → low', () => {
    expect(predictRejectionRisk(normalRecord).risk).toBe('low');
  });
});

describe('buildDRGAuditReport', () => {
  it('生成高套分值列表', () => {
    const r = buildDRGAuditReport('30d');
    expect(r.highCodingAlerts.length).toBeGreaterThan(0);
  });

  it('生成拒付风险分布', () => {
    const r = buildDRGAuditReport('30d');
    const total = r.rejectionRiskDistribution.low + r.rejectionRiskDistribution.medium + r.rejectionRiskDistribution.high;
    expect(total).toBe(r.totalRecords);
  });

  it('生成整改建议', () => {
    const r = buildDRGAuditReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

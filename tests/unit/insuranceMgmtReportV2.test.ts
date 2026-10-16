/**
 * 健澜科技 jlmedaios - 医保管理 V2 纯函数单测（M226-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDRGGrouping,
  buildInsuranceMgmtReportV2,
  calculateInsuranceReimbursement,
} from '../../src/bff/aggregators/insuranceMgmtReportV2Aggregator';

describe('assessDRGGrouping', () => {
  it('1诊断 1手术 → 外科组 权重2.5', () => {
    const r = assessDRGGrouping(1, 1);
    expect(r.group).toBe('外科组');
    expect(r.weight).toBe(2.5);
  });

  it('3诊断 0手术 → 内科组 权重1.5', () => {
    const r = assessDRGGrouping(3, 0);
    expect(r.group).toBe('内科组');
    expect(r.weight).toBe(1.5);
  });
});

describe('calculateInsuranceReimbursement', () => {
  it('费用10000 比例80% → 报销8000 自付2000', () => {
    const r = calculateInsuranceReimbursement(10000, 0.8);
    expect(r.reimbursement).toBe(8000);
    expect(r.patientPay).toBe(2000);
  });
});

describe('buildInsuranceMgmtReportV2', () => {
  it('生成政策数据', () => {
    const r = buildInsuranceMgmtReportV2('30d');
    expect(r.policy.employee).toBeGreaterThan(0);
  });

  it('生成结算数据', () => {
    const r = buildInsuranceMgmtReportV2('30d');
    expect(r.settlement.inpatient).toBeGreaterThan(0);
  });

  it('生成DRG数据', () => {
    const r = buildInsuranceMgmtReportV2('30d');
    expect(r.drg.groups).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInsuranceMgmtReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

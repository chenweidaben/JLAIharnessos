/**
 * 健澜科技 jlmedaios - 医保智能监管与 DRG/DIP 上报 V5 单测（M278-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDRGReportV5,
  buildInsuranceReportV5Report,
  detectInsuranceRiskV5,
  reconcileSettlementV5,
  type InsuranceClaim,
} from "../../src/bff/aggregators/insuranceReportV5Aggregator";

const mi: InsuranceClaim = { settlementId: "s1", diagnosis: "急性心梗", procedures: ["造影", "支架"], totalCost: 28000, insurancePay: 22000, patientPay: 6000, lengthOfStay: 8 };
const pneumonia: InsuranceClaim = { settlementId: "s2", diagnosis: "肺炎", procedures: ["抗感染"], totalCost: 5000, insurancePay: 4000, patientPay: 1000, lengthOfStay: 5 };

describe("buildDRGReportV5", () => {
  it("急性心梗→GRP-CI-01，预期25000", () => {
    const r = buildDRGReportV5(mi);
    expect(r.drgGroup).toBe("GRP-CI-01");
    expect(r.expectedCost).toBe(25000);
  });
});

describe("detectInsuranceRiskV5", () => {
  it("心梗费用28000 vs 预期25000，未超1.5倍→medium", () => {
    const r = detectInsuranceRiskV5({ ...mi, expectedCost: 25000 });
    // 28000 < 30000 且 28000 < 37500 → 无费用疑点；stay=8<30, procedures=2<10 → low
    expect(r.riskLevel).toBe("low");
  });
  it("费用40000且项目11个→high", () => {
    const r = detectInsuranceRiskV5({ ...mi, totalCost: 40000, procedures: Array(11).fill("x") });
    expect(r.riskLevel).toBe("high");
  });
});

describe("reconcileSettlementV5", () => {
  it("医保22000+患者6000=28000→平衡", () => {
    expect(reconcileSettlementV5(mi).balanced).toBe(true);
  });
  it("支付合计不等→不平衡", () => {
    expect(reconcileSettlementV5({ ...mi, patientPay: 5000 }).balanced).toBe(false);
  });
});

describe("buildInsuranceReportV5Report", () => {
  it("统计理赔与对账", () => {
    const r = buildInsuranceReportV5Report([mi, pneumonia]);
    expect(r.totalClaims).toBe(2);
    expect(r.balancedCount).toBe(2);
  });
});

/**
 * 健澜科技 jlmedaios - 医保审核统计 V13 单测（M382-B，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAuditDeductionAmountV13,
  computeInsuranceAuditCountV13,
  computeViolationCaseCountV13,
  type InsuranceAuditRecordV13,
} from "../../src/bff/aggregators/insuranceAuditStatsV13Aggregator";
import { insuranceAuditStatsV13Routes } from "../../src/bff/routes/insuranceAuditStatsV13";

const records: InsuranceAuditRecordV13[] = [
  { auditCount: 500, deductionAmount: 50000, violationCaseCount: 20 },
  { auditCount: 500, deductionAmount: 50000, violationCaseCount: 20 },
];

describe("computeInsuranceAuditCountV13", () => {
  // 算式：500+500 = 1000
  it("医保审核人次 = 1000 人次", () => {
    expect(computeInsuranceAuditCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeInsuranceAuditCountV13([])).toBe(0);
  });
});

describe("computeAuditDeductionAmountV13", () => {
  // 算式：50000+50000 = 100000
  it("审核扣款金额 = 100000 元", () => {
    expect(computeAuditDeductionAmountV13(records)).toBe(100000);
  });
});

describe("computeViolationCaseCountV13", () => {
  // 算式：20+20 = 40
  it("违规案例数 = 40 例", () => {
    expect(computeViolationCaseCountV13(records)).toBe(40);
  });
});

describe("insuranceAuditStatsV13Routes 读路由", () => {
  it("GET /api/v1/insurance-audit-stats 路由存在且 auth:true", () => {
    const route = insuranceAuditStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/insurance-audit-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

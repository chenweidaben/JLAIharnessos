/**
 * 健澜科技 jlmedaios - 医保申报 V13 单测（M382-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClaimPassRateV13,
  computeInsuranceClaimAmountV13,
  computeInsuranceClaimCountV13,
  type InsuranceClaimRecordV13,
} from "../../src/bff/aggregators/insuranceClaimV13Aggregator";
import { insuranceClaimV13Routes } from "../../src/bff/routes/insuranceClaimV13";

const records: InsuranceClaimRecordV13[] = [
  { claimCount: 500, claimAmount: 100000, passCount: 950, totalCount: 1000 },
  { claimCount: 500, claimAmount: 100000, passCount: 950, totalCount: 1000 },
];

describe("computeInsuranceClaimCountV13", () => {
  // 算式：500+500 = 1000
  it("医保申报人次 = 1000 人次", () => {
    expect(computeInsuranceClaimCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeInsuranceClaimCountV13([])).toBe(0);
  });
});

describe("computeInsuranceClaimAmountV13", () => {
  // 算式：100000+100000 = 200000
  it("医保申报金额 = 200000 元", () => {
    expect(computeInsuranceClaimAmountV13(records)).toBe(200000);
  });
});

describe("computeClaimPassRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("申报通过率 = 95.00%", () => {
    expect(computeClaimPassRateV13(records)).toBe(95.00);
  });
});

describe("insuranceClaimV13Routes 读路由", () => {
  it("GET /api/v1/insurance-claim 路由存在且 auth:true", () => {
    const route = insuranceClaimV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/insurance-claim",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

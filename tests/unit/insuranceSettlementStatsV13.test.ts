/**
 * 健澜科技 jlmedaios - 医保结算 V13 单测（M345-A，stats 避让 M329-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMonthlySettlementAmountV13,
  computeRejectionAmountV13,
  computeRejectionRateV13,
  type InsuranceSettlementRecordV13,
} from "../../src/bff/aggregators/insuranceSettlementStatsV13Aggregator";
import { insuranceSettlementStatsV13Routes } from "../../src/bff/routes/insuranceSettlementStatsV13";

const records: InsuranceSettlementRecordV13[] = [
  { settlementAmount: 60, rejectedAmount: 0.5 },
  { settlementAmount: 40, rejectedAmount: 0.5 },
];

describe("computeMonthlySettlementAmountV13", () => {
  // 算式：60+40 = 100
  it("月度结算金额 = 100 万元", () => {
    expect(computeMonthlySettlementAmountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeMonthlySettlementAmountV13([])).toBe(0);
  });
});

describe("computeRejectionAmountV13", () => {
  // 算式：0.5+0.5 = 1.0
  it("拒付金额 = 1.0 万元", () => {
    expect(computeRejectionAmountV13(records)).toBe(1.0);
  });
});

describe("computeRejectionRateV13", () => {
  // 算式：1.0/100×100 = 1.00
  it("拒付率 = 1.00%", () => {
    expect(computeRejectionRateV13(records)).toBe(1.00);
  });
});

describe("insuranceSettlementStatsV13Routes 读路由", () => {
  it("GET /api/v1/insurance-settlement-stats 路由存在且 auth:true", () => {
    const route = insuranceSettlementStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/insurance-settlement-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

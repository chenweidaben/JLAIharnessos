/**
 * 健澜科技 jlmedaios - 医保结算明细 V13 单测（M375-A，避让 detail 后缀）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInsuranceFundExpenseV13,
  computeInsuranceSettlementCountV13,
  computePersonalOutOfPocketRatioV13,
  type InsuranceSettlementRecordV13,
} from "../../src/bff/aggregators/insuranceSettlementDetailV13Aggregator";
import { insuranceSettlementDetailV13Routes } from "../../src/bff/routes/insuranceSettlementDetailV13";

const records: InsuranceSettlementRecordV13[] = [
  { settlementCount: 500, fundExpense: 100000, totalCost: 100000, personalOutOfPocket: 30000 },
  { settlementCount: 500, fundExpense: 100000, totalCost: 100000, personalOutOfPocket: 30000 },
];

describe("computeInsuranceSettlementCountV13", () => {
  // 算式：500+500 = 1000
  it("医保结算人次 = 1000", () => {
    expect(computeInsuranceSettlementCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeInsuranceSettlementCountV13([])).toBe(0);
  });
});

describe("computeInsuranceFundExpenseV13", () => {
  // 算式：100000+100000 = 200000.00
  it("医保基金支出 = 200000.00 元", () => {
    expect(computeInsuranceFundExpenseV13(records)).toBe(200000.00);
  });
});

describe("computePersonalOutOfPocketRatioV13", () => {
  // 算式：(30000+30000)/(100000+100000) = 60000/200000×100 = 30.00
  it("个人自付比例 = 30.00%", () => {
    expect(computePersonalOutOfPocketRatioV13(records)).toBe(30.00);
  });
});

describe("insuranceSettlementDetailV13Routes 读路由", () => {
  it("GET /api/v1/insurance-settlement-detail 路由存在且 auth:true", () => {
    const route = insuranceSettlementDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/insurance-settlement-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

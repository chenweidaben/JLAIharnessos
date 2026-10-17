/**
 * 健澜科技 jlmedaios - 医保结算 V13 单测（M329-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRejectionRateV13,
  sumRejectedAmountV13,
  sumSettlementAmountV13,
  type SettlementRecordV13,
} from "../../src/bff/aggregators/insuranceSettlementV13Aggregator";
import { insuranceSettlementV13Routes } from "../../src/bff/routes/insuranceSettlementV13";

const records: SettlementRecordV13[] = [
  { settlementAmount: 60, rejectedAmount: 1 },
  { settlementAmount: 40, rejectedAmount: 1 },
];

describe("sumSettlementAmountV13", () => {
  // 算式：60+40 = 100
  it("结算金额 = 100 万", () => {
    expect(sumSettlementAmountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(sumSettlementAmountV13([])).toBe(0);
  });
});

describe("sumRejectedAmountV13", () => {
  // 算式：1+1 = 2
  it("拒付金额 = 2 万", () => {
    expect(sumRejectedAmountV13(records)).toBe(2);
  });
});

describe("computeRejectionRateV13", () => {
  // 算式：2/100×100 = 2
  it("拒付率 = 2%", () => {
    expect(computeRejectionRateV13(100, 2)).toBe(2);
  });
});

describe("insuranceSettlementV13Routes 读路由", () => {
  it("GET /api/v1/insurance-settlement 路由存在且 auth:true", () => {
    const route = insuranceSettlementV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/insurance-settlement",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

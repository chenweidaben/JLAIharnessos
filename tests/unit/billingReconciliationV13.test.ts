/**
 * 健澜科技 jlmedaios - 医保对账 V13 单测（M329-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDiscrepancyRateV13,
  countDiscrepancyRecordsV13,
  countReconciliationRecordsV13,
  type ReconciliationRecordV13,
} from "../../src/bff/aggregators/billingReconciliationV13Aggregator";
import { billingReconciliationV13Routes } from "../../src/bff/routes/billingReconciliationV13";

const records: ReconciliationRecordV13[] = Array.from({ length: 100 }, (_, i) => ({
  recordId: `r${i + 1}`,
  hasDiscrepancy: i < 2,
}));

describe("countReconciliationRecordsV13", () => {
  // 算式：100 笔
  it("对账笔数 = 100", () => {
    expect(countReconciliationRecordsV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(countReconciliationRecordsV13([])).toBe(0);
  });
});

describe("countDiscrepancyRecordsV13", () => {
  // 算式：2 笔差异
  it("差异笔数 = 2", () => {
    expect(countDiscrepancyRecordsV13(records)).toBe(2);
  });
});

describe("computeDiscrepancyRateV13", () => {
  // 算式：2/100×100 = 2
  it("差异率 = 2%", () => {
    expect(computeDiscrepancyRateV13(100, 2)).toBe(2);
  });
});

describe("billingReconciliationV13Routes 读路由", () => {
  it("GET /api/v1/billing-reconciliation 路由存在且 auth:true", () => {
    const route = billingReconciliationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/billing-reconciliation",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 药品采购管理 V13 单测（M455-A，药品供应与库存管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugPurchasePlanCompletionRateV13,
  computeDrugPurchaseQualityQualifiedRateV13,
  computeDrugPurchaseVolumeBasedProcurementRateV13,
  type DrugPurchaseMgmtRecordV13,
} from "../../src/bff/aggregators/drugPurchaseMgmtV13Aggregator";
import { drugPurchaseMgmtV13Routes } from "../../src/bff/routes/drugPurchaseMgmtV13";

const records: DrugPurchaseMgmtRecordV13[] = [
  { completed: 950, totalPlan: 1000, actual: 900, agreed: 1000, qualified: 980, totalBatch: 1000 },
  { completed: 950, totalPlan: 1000, actual: 900, agreed: 1000, qualified: 980, totalBatch: 1000 },
];

describe("computeDrugPurchasePlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("药品采购计划完成率 = 95.00%", () => {
    expect(computeDrugPurchasePlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDrugPurchasePlanCompletionRateV13([])).toBe(0);
  });
});

describe("computeDrugPurchaseVolumeBasedProcurementRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("集中带量采购执行率 = 90.00%", () => {
    expect(computeDrugPurchaseVolumeBasedProcurementRateV13(records)).toBe(90.00);
  });
});

describe("computeDrugPurchaseQualityQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("采购质量合格率 = 98.00%", () => {
    expect(computeDrugPurchaseQualityQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("drugPurchaseMgmtV13Routes 读路由", () => {
  it("GET /api/v1/drug-purchase-mgmt 路由存在且 auth:true", () => {
    const route = drugPurchaseMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-purchase-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

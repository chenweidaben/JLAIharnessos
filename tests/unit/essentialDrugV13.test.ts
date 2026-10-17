/**
 * 健澜科技 jlmedaios - 基本药物管理 V13 单测（M368-D，M368 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBiddingDrugPurchaseRateV13,
  computeEssentialDrugAvailabilityRateV13,
  computeEssentialDrugUsageRateV13,
  type EssentialDrugRecordV13,
} from "../../src/bff/aggregators/essentialDrugV13Aggregator";
import { essentialDrugV13Routes } from "../../src/bff/routes/essentialDrugV13";

const records: EssentialDrugRecordV13[] = [
  { shouldStockVariety: 400, stockedVariety: 300, essentialDrugAmount: 400000, totalDrugAmount: 1000000, biddingPurchaseAmount: 800000, totalPurchaseAmount: 1000000 },
  { shouldStockVariety: 400, stockedVariety: 300, essentialDrugAmount: 400000, totalDrugAmount: 1000000, biddingPurchaseAmount: 800000, totalPurchaseAmount: 1000000 },
];

describe("computeEssentialDrugAvailabilityRateV13", () => {
  // 算式：(300+300)/(400+400) = 600/800×100 = 75.00
  it("基本药物配备率 = 75.00%", () => {
    expect(computeEssentialDrugAvailabilityRateV13(records)).toBe(75.00);
  });
  it("空态 → 0", () => {
    expect(computeEssentialDrugAvailabilityRateV13([])).toBe(0);
  });
});

describe("computeEssentialDrugUsageRateV13", () => {
  // 算式：(400000+400000)/(1000000+1000000) = 800000/2000000×100 = 40.00
  it("基本药物使用率 = 40.00%", () => {
    expect(computeEssentialDrugUsageRateV13(records)).toBe(40.00);
  });
});

describe("computeBiddingDrugPurchaseRateV13", () => {
  // 算式：(800000+800000)/(1000000+1000000) = 1600000/2000000×100 = 80.00
  it("中标药品采购率 = 80.00%", () => {
    expect(computeBiddingDrugPurchaseRateV13(records)).toBe(80.00);
  });
});

describe("essentialDrugV13Routes 读路由", () => {
  it("GET /api/v1/essential-drug 路由存在且 auth:true", () => {
    const route = essentialDrugV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/essential-drug",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 药品库存管理 V13 单测（M359-C，stats 避让已有 drugInventory）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugInventoryTurnoverRateV13,
  computeMonthlyDrugShortageTimesV13,
  computeNearExpiryDrugRatioV13,
  type DrugInventoryStatsRecordV13,
} from "../../src/bff/aggregators/drugInventoryStatsV13Aggregator";
import { drugInventoryStatsV13Routes } from "../../src/bff/routes/drugInventoryStatsV13";

const records: DrugInventoryStatsRecordV13[] = [
  { outboundAmount: 800, avgInventoryAmount: 200, nearExpiryCategory: 10, totalCategory: 200, monthlyShortageTimes: 3 },
  { outboundAmount: 800, avgInventoryAmount: 200, nearExpiryCategory: 10, totalCategory: 200, monthlyShortageTimes: 2 },
];

describe("computeDrugInventoryTurnoverRateV13", () => {
  // 算式：(800+800)/(200+200) = 1600/400 = 4.00
  it("药品库存周转率 = 4.00", () => {
    expect(computeDrugInventoryTurnoverRateV13(records)).toBe(4.00);
  });
  it("空态 → 0", () => {
    expect(computeDrugInventoryTurnoverRateV13([])).toBe(0);
  });
});

describe("computeNearExpiryDrugRatioV13", () => {
  // 算式：(10+10)/(200+200) = 20/400×100 = 5.00
  it("近效期药品占比 = 5.00%", () => {
    expect(computeNearExpiryDrugRatioV13(records)).toBe(5.00);
  });
});

describe("computeMonthlyDrugShortageTimesV13", () => {
  // 算式：3+2 = 5
  it("月度缺药次数 = 5", () => {
    expect(computeMonthlyDrugShortageTimesV13(records)).toBe(5);
  });
});

describe("drugInventoryStatsV13Routes 读路由", () => {
  it("GET /api/v1/drug-inventory-stats 路由存在且 auth:true", () => {
    const route = drugInventoryStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-inventory-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

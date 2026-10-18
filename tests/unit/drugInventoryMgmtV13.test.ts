/**
 * 健澜科技 jlmedaios - 药品库存管理 V13 单测（M455-B，药品供应与库存管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugInventoryStockoutRateV13,
  computeDrugInventoryTurnoverComplianceRateV13,
  computeDrugInventoryTurnoverRateV13,
  type DrugInventoryMgmtRecordV13,
} from "../../src/bff/aggregators/drugInventoryMgmtV13Aggregator";
import { drugInventoryMgmtV13Routes } from "../../src/bff/routes/drugInventoryMgmtV13";

const records: DrugInventoryMgmtRecordV13[] = [
  { outbound: 950, avgInventory: 1000, qualified: 900, totalItem: 1000, stockout: 30 },
  { outbound: 950, avgInventory: 1000, qualified: 900, totalItem: 1000, stockout: 30 },
];

describe("computeDrugInventoryTurnoverRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("药品库存周转率 = 95.00%", () => {
    expect(computeDrugInventoryTurnoverRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDrugInventoryTurnoverRateV13([])).toBe(0);
  });
});

describe("computeDrugInventoryTurnoverComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("库存周转率达标率 = 90.00%", () => {
    expect(computeDrugInventoryTurnoverComplianceRateV13(records)).toBe(90.00);
  });
});

describe("computeDrugInventoryStockoutRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00（反向指标）
  it("缺货发生率 = 3.00%（越低越好）", () => {
    expect(computeDrugInventoryStockoutRateV13(records)).toBe(3.00);
  });
});

describe("drugInventoryMgmtV13Routes 读路由", () => {
  it("GET /api/v1/drug-inventory-mgmt 路由存在且 auth:true", () => {
    const route = drugInventoryMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-inventory-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

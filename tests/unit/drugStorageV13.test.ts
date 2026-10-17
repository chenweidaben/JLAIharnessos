/**
 * 健澜科技 jlmedaios - 药库管理 V13 单测（M380-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugInStockVarietyCountV13,
  computeDrugLossRateV13,
  computeInventoryTurnoverRateV13,
  type DrugStorageRecordV13,
} from "../../src/bff/aggregators/drugStorageV13Aggregator";
import { drugStorageV13Routes } from "../../src/bff/routes/drugStorageV13";

const records: DrugStorageRecordV13[] = [
  { inStockVarietyCount: 500, outboundAmount: 200000, avgInventoryAmount: 100000, lossAmount: 5000, totalInventoryAmount: 100000 },
  { inStockVarietyCount: 500, outboundAmount: 200000, avgInventoryAmount: 100000, lossAmount: 5000, totalInventoryAmount: 100000 },
];

describe("computeDrugInStockVarietyCountV13", () => {
  // 算式：500+500 = 1000
  it("药品在库品种数 = 1000 种", () => {
    expect(computeDrugInStockVarietyCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeDrugInStockVarietyCountV13([])).toBe(0);
  });
});

describe("computeInventoryTurnoverRateV13", () => {
  // 算式：(200000+200000)/(100000+100000) = 400000/200000×100 = 200.00
  it("库存周转率 = 200.00%", () => {
    expect(computeInventoryTurnoverRateV13(records)).toBe(200.00);
  });
});

describe("computeDrugLossRateV13", () => {
  // 算式：(5000+5000)/(100000+100000) = 10000/200000×100 = 5.00
  it("药品报损率 = 5.00%", () => {
    expect(computeDrugLossRateV13(records)).toBe(5.00);
  });
});

describe("drugStorageV13Routes 读路由", () => {
  it("GET /api/v1/drug-storage 路由存在且 auth:true", () => {
    const route = drugStorageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-storage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

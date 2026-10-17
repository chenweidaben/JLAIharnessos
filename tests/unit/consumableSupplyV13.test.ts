/**
 * 健澜科技 jlmedaios - 耗材供应 V13 单测（M408-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeConsumableInventoryTurnoverDaysV13,
  computeConsumableStockoutRateV13,
  computeHighValueConsumableTraceabilityRateV13,
  type ConsumableSupplyRecordV13,
} from "../../src/bff/aggregators/consumableSupplyV13Aggregator";
import { consumableSupplyV13Routes } from "../../src/bff/routes/consumableSupplyV13";

const records: ConsumableSupplyRecordV13[] = [
  { traceable: 980, total: 1000, turnoverDays: 25.5, stockout: 20, purchase: 1000 },
  { traceable: 980, total: 1000, turnoverDays: 25.5, stockout: 20, purchase: 1000 },
];

describe("computeHighValueConsumableTraceabilityRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("高值耗材追溯率 = 98.00%", () => {
    expect(computeHighValueConsumableTraceabilityRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeHighValueConsumableTraceabilityRateV13([])).toBe(0);
  });
});

describe("computeConsumableInventoryTurnoverDaysV13", () => {
  // 算式：(25.5+25.5)/2 = 25.5 → Math.ceil(25.5) = 26
  it("耗材库存周转天数 = 26 天（Math.ceil 向上取整）", () => {
    expect(computeConsumableInventoryTurnoverDaysV13(records)).toBe(26);
  });
});

describe("computeConsumableStockoutRateV13", () => {
  // 算式：(20+20)/(1000+1000)×100 = 40/2000×100 = 2.00
  it("耗材断货率 = 2.00%", () => {
    expect(computeConsumableStockoutRateV13(records)).toBe(2.00);
  });
});

describe("consumableSupplyV13Routes 读路由", () => {
  it("GET /api/v1/consumable-supply 路由存在且 auth:true", () => {
    const route = consumableSupplyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/consumable-supply",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

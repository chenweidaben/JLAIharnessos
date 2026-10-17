/**
 * 健澜科技 jlmedaios - 耗材库存与供应预测 V3 单测（M277-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSupplyForecastV3Report,
  forecastConsumptionV3,
  optimizeInventoryV3,
  reorderPointV3,
  type SupplyItem,
} from "../../src/bff/aggregators/supplyForecastV3Aggregator";

describe("forecastConsumptionV3", () => {
  it("日均10×提前期5×1.1=55", () => {
    expect(forecastConsumptionV3(10, 5)).toBe(55);
  });
});

describe("reorderPointV3", () => {
  it("提前期消耗55+安全库存20=75", () => {
    expect(reorderPointV3(10, 5, 20)).toBe(75);
  });
});

describe("optimizeInventoryV3", () => {
  it("库存30≤补货点75的0.5→critical", () => {
    const item: SupplyItem = { itemId: "x", warehouse: "w", stock: 30, avgDailyUsage: 10, safetyStock: 20 };
    const r = optimizeInventoryV3(item, 5);
    expect(r.status).toBe("critical");
    expect(r.suggestedOrder).toBeGreaterThan(0);
  });
  it("库存200远高于补货点→healthy", () => {
    const item: SupplyItem = { itemId: "x", warehouse: "w", stock: 200, avgDailyUsage: 10, safetyStock: 20 };
    expect(optimizeInventoryV3(item, 5).status).toBe("healthy");
  });
});

describe("buildSupplyForecastV3Report", () => {
  it("统计各状态数量", () => {
    const items: SupplyItem[] = [
      { itemId: "a", warehouse: "w", stock: 30, avgDailyUsage: 10, safetyStock: 20 },
      { itemId: "b", warehouse: "w", stock: 200, avgDailyUsage: 10, safetyStock: 20 },
    ];
    const r = buildSupplyForecastV3Report(items, 5);
    expect(r.totalItems).toBe(2);
    expect(r.criticalCount).toBe(1);
  });
});

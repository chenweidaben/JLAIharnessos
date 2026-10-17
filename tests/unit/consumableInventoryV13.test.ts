/**
 * 健澜科技 jlmedaios - 耗材库存 V13 单测（M328-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  countLowStockItemsV13,
  countMonthlyUsageV13,
  countNearExpiryItemsV13,
  type ConsumableItemV13,
} from "../../src/bff/aggregators/consumableInventoryV13Aggregator";
import { consumableInventoryV13Routes } from "../../src/bff/routes/consumableInventoryV13";

const items: ConsumableItemV13[] = [
  { name: "注射器", stock: 100, safetyStock: 200, daysToExpiry: 60, monthlyUsage: 100 },
  { name: "输液器", stock: 50, safetyStock: 100, daysToExpiry: 20, monthlyUsage: 50 },
  { name: "纱布", stock: 300, safetyStock: 100, daysToExpiry: 90, monthlyUsage: 30 },
  { name: "手套", stock: 20, safetyStock: 50, daysToExpiry: 15, monthlyUsage: 20 },
  { name: "口罩", stock: 500, safetyStock: 200, daysToExpiry: 120, monthlyUsage: 10 },
];

describe("countLowStockItemsV13", () => {
  // 算式：注射器100<200 / 输液器50<100 / 手套20<50 → 3
  it("低库存 = 3", () => {
    expect(countLowStockItemsV13(items)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(countLowStockItemsV13([])).toBe(0);
  });
});

describe("countNearExpiryItemsV13", () => {
  // 算式：输液器20天 / 手套15天 → 2
  it("近效期 = 2", () => {
    expect(countNearExpiryItemsV13(items)).toBe(2);
  });
});

describe("countMonthlyUsageV13", () => {
  // 算式：100+50+30+20+10 = 210
  it("领用量 = 210", () => {
    expect(countMonthlyUsageV13(items)).toBe(210);
  });
});

describe("consumableInventoryV13Routes 读路由", () => {
  it("GET /api/v1/consumable-inventory 路由存在且 auth:true", () => {
    const route = consumableInventoryV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/consumable-inventory",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

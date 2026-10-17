/**
 * 健澜科技 jlmedaios - 药房库存预警 V13 单测（M312-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkExpiringSoonV13,
  checkLowStockV13,
  suggestReorderV13,
  type PharmacyItemV13,
} from "../../src/bff/aggregators/pharmacyInventoryAlertV13Aggregator";
import { pharmacyInventoryAlertV13Routes } from "../../src/bff/routes/pharmacyInventoryAlertV13";

const items: PharmacyItemV13[] = [
  { itemId: "m1", name: "阿司匹林", currentStock: 10, safetyStock: 20, expiryDaysFromNow: 5 },
  { itemId: "m2", name: "头孢", currentStock: 50, safetyStock: 30, expiryDaysFromNow: 30 },
  { itemId: "m3", name: "布洛芬", currentStock: 5, safetyStock: 15, expiryDaysFromNow: 10 },
];

describe("checkLowStockV13", () => {
  // 算式：m1 current=10 < safety=20 → 低库存；m3 current=5 < safety=15 → 低库存
  // m2 current=50 >= safety=30 → 正常
  it("低库存 = m1 + m3 = 2 条", () => {
    expect(checkLowStockV13(items).map((i) => i.itemId)).toEqual(["m1", "m3"]);
  });
  it("空态 → []", () => {
    expect(checkLowStockV13([]).length).toBe(0);
  });
});

describe("suggestReorderV13", () => {
  // 算式：m1 suggestQty = safetyStock×2 - currentStock = 20×2 - 10 = 40 - 10 = 30
  it("m1 建议补 30", () => {
    expect(suggestReorderV13(items[0]).suggestQty).toBe(30);
  });
  // 算式：m3 suggestQty = 15×2 - 5 = 30 - 5 = 25
  it("m3 建议补 25", () => {
    expect(suggestReorderV13(items[2]).suggestQty).toBe(25);
  });
});

describe("checkExpiringSoonV13", () => {
  // 算式：days=7 → m1 expiry=5 ≤ 7 命中；m2 expiry=30 > 7 不命中；m3 expiry=10 > 7 不命中
  it("days=7 → 仅 m1", () => {
    expect(checkExpiringSoonV13(items, 7).map((i) => i.itemId)).toEqual(["m1"]);
  });
});

describe("pharmacyInventoryAlertV13Routes 读路由", () => {
  it("GET /api/v1/pharmacy-inventory-alert 路由存在且 auth:true", () => {
    const route = pharmacyInventoryAlertV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacy-inventory-alert",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

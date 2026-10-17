/**
 * 健澜科技 jlmedaios - 药品库存 V13 单测（M328-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInventoryVarianceRateV13,
  countNearExpiryDrugsV13,
  countOutOfStockDrugsV13,
  type PharmacyDrugV13,
} from "../../src/bff/aggregators/pharmacyInventoryV13Aggregator";
import { pharmacyInventoryV13Routes } from "../../src/bff/routes/pharmacyInventoryV13";

const drugs: PharmacyDrugV13[] = [
  { name: "阿莫西林", stock: 100, daysToExpiry: 60, hasVariance: false },
  { name: "头孢", stock: 50, daysToExpiry: 30, hasVariance: false },
  { name: "布洛芬", stock: 0, daysToExpiry: 120, hasVariance: false },
  { name: "维生素C", stock: 200, daysToExpiry: 180, hasVariance: false },
  { name: "奥美拉唑", stock: 0, daysToExpiry: 45, hasVariance: false },
  { name: "二甲双胍", stock: 80, daysToExpiry: 90, hasVariance: false },
  { name: "阿托伐他汀", stock: 60, daysToExpiry: 200, hasVariance: false },
  { name: "阿司匹林", stock: 150, daysToExpiry: 150, hasVariance: false },
  { name: "氯吡格雷", stock: 90, daysToExpiry: 100, hasVariance: false },
  { name: "单硝酸异山梨酯", stock: 40, daysToExpiry: 300, hasVariance: true },
];

describe("countNearExpiryDrugsV13", () => {
  // 算式：阿莫西林60 / 头孢30 / 奥美拉唑45 / 二甲双胍90 → 4
  it("近效期 = 4", () => {
    expect(countNearExpiryDrugsV13(drugs)).toBe(4);
  });
  it("空态 → 0", () => {
    expect(countNearExpiryDrugsV13([])).toBe(0);
  });
});

describe("countOutOfStockDrugsV13", () => {
  // 算式：布洛芬0 / 奥美拉唑0 → 2
  it("缺货 = 2", () => {
    expect(countOutOfStockDrugsV13(drugs)).toBe(2);
  });
});

describe("computeInventoryVarianceRateV13", () => {
  // 算式：1/10×100 = 10
  it("差异率 = 10%", () => {
    expect(computeInventoryVarianceRateV13(drugs)).toBe(10);
  });
});

describe("pharmacyInventoryV13Routes 读路由", () => {
  it("GET /api/v1/pharmacy-inventory 路由存在且 auth:true", () => {
    const route = pharmacyInventoryV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacy-inventory",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

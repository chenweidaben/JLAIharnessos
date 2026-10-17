/**
 * 健澜科技 jlmedaios - 药品配送 V13 单测（M406-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeColdChainDrugPassRateV13,
  computeDrugDeliveryTimelyRateV13,
  computeDrugStockoutRateV13,
  type PharmacyDrugDeliveryRecordV13,
} from "../../src/bff/aggregators/pharmacyDrugDeliveryV13Aggregator";
import { pharmacyDrugDeliveryV13Routes } from "../../src/bff/routes/pharmacyDrugDeliveryV13";

const records: PharmacyDrugDeliveryRecordV13[] = [
  { timely: 980, should: 1000, stockout: 20, purchase: 1000, coldPass: 970, coldTotal: 1000 },
  { timely: 980, should: 1000, stockout: 20, purchase: 1000, coldPass: 970, coldTotal: 1000 },
];

describe("computeDrugDeliveryTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("药品配送及时率 = 98.00%", () => {
    expect(computeDrugDeliveryTimelyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeDrugDeliveryTimelyRateV13([])).toBe(0);
  });
});

describe("computeDrugStockoutRateV13", () => {
  // 算式：(20+20)/(1000+1000) = 40/2000×100 = 2.00
  it("药品断货率 = 2.00%", () => {
    expect(computeDrugStockoutRateV13(records)).toBe(2.00);
  });
});

describe("computeColdChainDrugPassRateV13", () => {
  // 算式：(970+970)/(1000+1000) = 1940/2000×100 = 97.00
  it("冷链药品合格率 = 97.00%", () => {
    expect(computeColdChainDrugPassRateV13(records)).toBe(97.00);
  });
});

describe("pharmacyDrugDeliveryV13Routes 读路由", () => {
  it("GET /api/v1/pharmacy-drug-delivery 路由存在且 auth:true", () => {
    const route = pharmacyDrugDeliveryV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacy-drug-delivery",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

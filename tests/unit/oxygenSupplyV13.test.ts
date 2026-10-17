/**
 * 健澜科技 jlmedaios - 氧气供应 V13 单测（M351-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeLiquidOxygenConsumptionV13,
  computeOxygenSupplyPassRateV13,
  computeSuctionAnomalyCountV13,
  type OxygenSupplyRecordV13,
} from "../../src/bff/aggregators/oxygenSupplyV13Aggregator";
import { oxygenSupplyV13Routes } from "../../src/bff/routes/oxygenSupplyV13";

const records: OxygenSupplyRecordV13[] = [
  { liquidOxygenConsumption: 5000, suctionAnomalyCount: 3, oxygenTestCount: 100, oxygenPassedCount: 99 },
  { liquidOxygenConsumption: 5000, suctionAnomalyCount: 2, oxygenTestCount: 100, oxygenPassedCount: 98 },
];

describe("computeLiquidOxygenConsumptionV13", () => {
  // 算式：5000+5000 = 10000
  it("液氧消耗量 = 10000 升", () => {
    expect(computeLiquidOxygenConsumptionV13(records)).toBe(10000);
  });
  it("空态 → 0", () => {
    expect(computeLiquidOxygenConsumptionV13([])).toBe(0);
  });
});

describe("computeSuctionAnomalyCountV13", () => {
  // 算式：3+2 = 5
  it("负压吸引异常次数 = 5", () => {
    expect(computeSuctionAnomalyCountV13(records)).toBe(5);
  });
});

describe("computeOxygenSupplyPassRateV13", () => {
  // 算式：(99+98)/(100+100) = 197/200×100 = 98.50
  it("中心供氧合格率 = 98.50%", () => {
    expect(computeOxygenSupplyPassRateV13(records)).toBe(98.50);
  });
});

describe("oxygenSupplyV13Routes 读路由", () => {
  it("GET /api/v1/oxygen-supply 路由存在且 auth:true", () => {
    const route = oxygenSupplyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/oxygen-supply",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 血库库存 V13 单测（M328-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  countBloodByTypeV13,
  countNearExpiryBloodV13,
  type BloodUnitV13,
} from "../../src/bff/aggregators/bloodInventoryV13Aggregator";
import { bloodInventoryV13Routes } from "../../src/bff/routes/bloodInventoryV13";

const bloods: BloodUnitV13[] = [
  { bloodType: "A", daysToExpiry: 30 },
  { bloodType: "A", daysToExpiry: 20 },
  { bloodType: "A", daysToExpiry: 10 },
  { bloodType: "A", daysToExpiry: 5 },
  { bloodType: "A", daysToExpiry: 60 },
  { bloodType: "B", daysToExpiry: 40 },
  { bloodType: "B", daysToExpiry: 30 },
  { bloodType: "B", daysToExpiry: 3 },
  { bloodType: "O", daysToExpiry: 50 },
  { bloodType: "O", daysToExpiry: 20 },
  { bloodType: "O", daysToExpiry: 15 },
  { bloodType: "O", daysToExpiry: 10 },
  { bloodType: "O", daysToExpiry: 90 },
  { bloodType: "O", daysToExpiry: 70 },
  { bloodType: "O", daysToExpiry: 80 },
  { bloodType: "O", daysToExpiry: 60 },
  { bloodType: "AB", daysToExpiry: 25 },
  { bloodType: "AB", daysToExpiry: 35 },
];

describe("countBloodByTypeV13", () => {
  // 算式：A=5 / B=3 / O=8 / AB=2
  it("A/B/O/AB = 5/3/8/2", () => {
    const result = countBloodByTypeV13(bloods);
    expect(result.A).toBe(5);
    expect(result.B).toBe(3);
    expect(result.O).toBe(8);
    expect(result.AB).toBe(2);
  });
  it("空态 → 全 0", () => {
    const result = countBloodByTypeV13([]);
    expect(result.A).toBe(0);
    expect(result.B).toBe(0);
    expect(result.O).toBe(0);
    expect(result.AB).toBe(0);
  });
});

describe("countNearExpiryBloodV13", () => {
  // 算式：A型5天 / B型3天 → 2
  it("近效期 = 2", () => {
    expect(countNearExpiryBloodV13(bloods)).toBe(2);
  });
  it("空态近效期 → 0", () => {
    expect(countNearExpiryBloodV13([])).toBe(0);
  });
});

describe("bloodInventoryV13Routes 读路由", () => {
  it("GET /api/v1/blood-inventory 路由存在且 auth:true", () => {
    const route = bloodInventoryV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-inventory",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

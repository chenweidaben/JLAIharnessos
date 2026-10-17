/**
 * 健澜科技 jlmedaios - 医嘱套餐规范 V13 单测（M315-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyDeviationReasonV13,
  computeDeviationRateV13,
  computeOrderSetUsageRateV13,
  type OrderSetOrderV13,
} from "../../src/bff/aggregators/orderSetComplianceV13Aggregator";
import { orderSetComplianceV13Routes } from "../../src/bff/routes/orderSetComplianceV13";

const orders: OrderSetOrderV13[] = [
  { orderId: "o1", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o2", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o3", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o4", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o5", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o6", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o7", dept: "cardio", usedOrderSet: false, isDeviated: true, deviationReason: "药物剂量调整" },
  { orderId: "o8", dept: "cardio", usedOrderSet: false, isDeviated: true, deviationReason: "药物剂量调整" },
  { orderId: "o9", dept: "cardio", usedOrderSet: false, isDeviated: true, deviationReason: "特殊患者" },
  { orderId: "o10", dept: "cardio", usedOrderSet: false, isDeviated: false },
];

describe("computeOrderSetUsageRateV13", () => {
  // 算式：10 医嘱中 6 用套餐（o1-o6）→ 6/10×100 = 60
  it("usageRate = 60", () => {
    expect(computeOrderSetUsageRateV13(orders)).toBe(60);
  });
  it("空态 → 0", () => {
    expect(computeOrderSetUsageRateV13([])).toBe(0);
  });
});

describe("computeDeviationRateV13", () => {
  // 算式：10 医嘱中 3 偏离（o7/o8/o9）→ 3/10×100 = 30
  it("deviationRate = 30", () => {
    expect(computeDeviationRateV13(orders)).toBe(30);
  });
});

describe("classifyDeviationReasonV13", () => {
  // 算式：o7/o8 = 药物剂量调整（2）；o9 = 特殊患者（1）
  it("药物剂量调整=2, 特殊患者=1", () => {
    const reasons = classifyDeviationReasonV13(orders.filter((o) => o.isDeviated));
    expect(reasons.find((r) => r.reason === "药物剂量调整")?.count).toBe(2);
    expect(reasons.find((r) => r.reason === "特殊患者")?.count).toBe(1);
  });
  it("空态 → []", () => {
    expect(classifyDeviationReasonV13([]).length).toBe(0);
  });
});

describe("orderSetComplianceV13Routes 读路由", () => {
  it("GET /api/v1/order-set-compliance 路由存在且 auth:true", () => {
    const route = orderSetComplianceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/order-set-compliance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

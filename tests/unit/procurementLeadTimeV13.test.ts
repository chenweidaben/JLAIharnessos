/**
 * 健澜科技 jlmedaios - 采购周期预警 V13 单测（M317-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgLeadTimeV13,
  flagLeadTimeAlertV13,
  identifyDelayedOrdersV13,
  type ProcurementOrderV13,
} from "../../src/bff/aggregators/procurementLeadTimeV13Aggregator";
import { procurementLeadTimeV13Routes } from "../../src/bff/routes/procurementLeadTimeV13";

const baseOrders: ProcurementOrderV13[] = [
  { orderId: "o1", itemName: "注射器", leadTimeDays: 5 },
  { orderId: "o2", itemName: "输液器", leadTimeDays: 7 },
  { orderId: "o3", itemName: "纱布", leadTimeDays: 8 },
  { orderId: "o4", itemName: "手套", leadTimeDays: 10 },
];

describe("computeAvgLeadTimeV13", () => {
  // 算式：(5+7+8+10)/4 = 30/4 = 7.5
  it("avg = 7.5", () => {
    expect(computeAvgLeadTimeV13(baseOrders)).toBe(7.5);
  });
  it("空态 → 0", () => {
    expect(computeAvgLeadTimeV13([])).toBe(0);
  });
});

describe("flagLeadTimeAlertV13", () => {
  // 算式：avg=7.5；黄阈值=7.5×1.5=11.25；红阈值=7.5×2=15
  // 12 > 11.25 且不 > 15 → 黄
  it("12 天 → 黄牌", () => {
    expect(flagLeadTimeAlertV13({ orderId: "x", itemName: "x", leadTimeDays: 12 }, 7.5)).toBe("yellow");
  });
  // 算式：16 > 15 → 红
  it("16 天 → 红牌", () => {
    expect(flagLeadTimeAlertV13({ orderId: "x", itemName: "x", leadTimeDays: 16 }, 7.5)).toBe("red");
  });
});

describe("identifyDelayedOrdersV13", () => {
  // 算式：avg=7.5；黄阈值=11.25
  // o5=12>11.25 → 延迟；o6=16>11.25 → 延迟
  it("延迟订单 = 2（12天/16天）", () => {
    const orders: ProcurementOrderV13[] = [
      ...baseOrders,
      { orderId: "o5", itemName: "消毒", leadTimeDays: 12 },
      { orderId: "o6", itemName: "导管", leadTimeDays: 16 },
    ];
    expect(identifyDelayedOrdersV13(orders, 7.5).length).toBe(2);
  });
});

describe("procurementLeadTimeV13Routes 读路由", () => {
  it("GET /api/v1/procurement-lead-time 路由存在且 auth:true", () => {
    const route = procurementLeadTimeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/procurement-lead-time",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

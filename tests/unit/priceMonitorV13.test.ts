/**
 * 健澜科技 jlmedaios - 价格监控 V13 单测（M382-D，M382 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalServicePriceItemCountV13,
  computePriceAdjustmentCountV13,
  computePriceComplaintCountV13,
  type PriceMonitorRecordV13,
} from "../../src/bff/aggregators/priceMonitorV13Aggregator";
import { priceMonitorV13Routes } from "../../src/bff/routes/priceMonitorV13";

const records: PriceMonitorRecordV13[] = [
  { priceItemCount: 500, priceAdjustmentCount: 20, priceComplaintCount: 10 },
  { priceItemCount: 500, priceAdjustmentCount: 20, priceComplaintCount: 10 },
];

describe("computeMedicalServicePriceItemCountV13", () => {
  // 算式：500+500 = 1000
  it("医疗服务价格项目数 = 1000 项", () => {
    expect(computeMedicalServicePriceItemCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeMedicalServicePriceItemCountV13([])).toBe(0);
  });
});

describe("computePriceAdjustmentCountV13", () => {
  // 算式：20+20 = 40
  it("价格调整次数 = 40 次", () => {
    expect(computePriceAdjustmentCountV13(records)).toBe(40);
  });
});

describe("computePriceComplaintCountV13", () => {
  // 算式：10+10 = 20
  it("价格投诉数 = 20 件", () => {
    expect(computePriceComplaintCountV13(records)).toBe(20);
  });
});

describe("priceMonitorV13Routes 读路由", () => {
  it("GET /api/v1/price-monitor 路由存在且 auth:true", () => {
    const route = priceMonitorV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/price-monitor",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 价格管理 V13 单测（M375-D，M375 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePriceAdjustmentExecutionRateV13,
  computePriceComplaintCountV13,
  computePriceItemCountV13,
  type PriceManagementRecordV13,
} from "../../src/bff/aggregators/priceManagementV13Aggregator";
import { priceManagementV13Routes } from "../../src/bff/routes/priceManagementV13";

const records: PriceManagementRecordV13[] = [
  { priceItemCount: 100, shouldAdjustCount: 100, executedAdjustCount: 95, complaintCount: 5 },
  { priceItemCount: 100, shouldAdjustCount: 100, executedAdjustCount: 95, complaintCount: 5 },
];

describe("computePriceItemCountV13", () => {
  // 算式：100+100 = 200
  it("医疗服务价格项目数 = 200 项", () => {
    expect(computePriceItemCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computePriceItemCountV13([])).toBe(0);
  });
});

describe("computePriceAdjustmentExecutionRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("价格调整执行率 = 95.00%", () => {
    expect(computePriceAdjustmentExecutionRateV13(records)).toBe(95.00);
  });
});

describe("computePriceComplaintCountV13", () => {
  // 算式：5+5 = 10
  it("价格投诉数 = 10 件", () => {
    expect(computePriceComplaintCountV13(records)).toBe(10);
  });
});

describe("priceManagementV13Routes 读路由", () => {
  it("GET /api/v1/price-management 路由存在且 auth:true", () => {
    const route = priceManagementV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/price-management",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

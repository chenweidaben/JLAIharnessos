/**
 * 健澜科技 jlmedaios - 后勤服务 V13 单测（M377-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBeddingWashCountV13,
  computeMealSupplyCountV13,
  computePropertyWorkOrderCompletionRateV13,
  type LogisticsServiceRecordV13,
} from "../../src/bff/aggregators/logisticsServiceV13Aggregator";
import { logisticsServiceV13Routes } from "../../src/bff/routes/logisticsServiceV13";

const records: LogisticsServiceRecordV13[] = [
  { beddingWashCount: 1000, mealSupplyCount: 3000, workOrderTotalCount: 100, workOrderCompleteCount: 95 },
  { beddingWashCount: 1000, mealSupplyCount: 3000, workOrderTotalCount: 100, workOrderCompleteCount: 95 },
];

describe("computeBeddingWashCountV13", () => {
  // 算式：1000+1000 = 2000
  it("被服洗涤量 = 2000 件", () => {
    expect(computeBeddingWashCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeBeddingWashCountV13([])).toBe(0);
  });
});

describe("computeMealSupplyCountV13", () => {
  // 算式：3000+3000 = 6000
  it("膳食供应人次 = 6000", () => {
    expect(computeMealSupplyCountV13(records)).toBe(6000);
  });
});

describe("computePropertyWorkOrderCompletionRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("物业工单完成率 = 95.00%", () => {
    expect(computePropertyWorkOrderCompletionRateV13(records)).toBe(95.00);
  });
});

describe("logisticsServiceV13Routes 读路由", () => {
  it("GET /api/v1/logistics-service 路由存在且 auth:true", () => {
    const route = logisticsServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/logistics-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

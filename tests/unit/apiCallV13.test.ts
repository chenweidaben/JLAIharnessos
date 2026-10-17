/**
 * 健澜科技 jlmedaios - API 调用量 V13 单测（M344-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDailyAvgV13,
  computeFailureRateV13,
  computePeakV13,
  type ApiCallRecordV13,
} from "../../src/bff/aggregators/apiCallV13Aggregator";
import { apiCallV13Routes } from "../../src/bff/routes/apiCallV13";

const records: ApiCallRecordV13[] = [
  { totalCalls: 100, failedCalls: 1 },
  { totalCalls: 200, failedCalls: 2 },
  { totalCalls: 300, failedCalls: 3 },
];

describe("computeDailyAvgV13", () => {
  // 算式：(100+200+300)/3 = 600/3 = 200
  it("日调用量均值 = 200", () => {
    expect(computeDailyAvgV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computeDailyAvgV13([])).toBe(0);
  });
});

describe("computePeakV13", () => {
  // 算式：max(100,200,300) = 300
  it("峰值 = 300", () => {
    expect(computePeakV13(records)).toBe(300);
  });
});

describe("computeFailureRateV13", () => {
  // 算式：(1+2+3)/(100+200+300) = 6/600×100 = 1.00
  it("失败率 = 1.00%", () => {
    expect(computeFailureRateV13(records)).toBe(1.00);
  });
});

describe("apiCallV13Routes 读路由", () => {
  it("GET /api/v1/api-call 路由存在且 auth:true", () => {
    const route = apiCallV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/api-call",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

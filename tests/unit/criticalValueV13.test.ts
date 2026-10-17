/**
 * 健澜科技 jlmedaios - 危急值 V13 单测（M335-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCriticalValueCountV13,
  computeMissedReportRateV13,
  computeTimelyHandlingRateV13,
  type CriticalValueRecordV13,
} from "../../src/bff/aggregators/criticalValueV13Aggregator";
import { criticalValueV13Routes } from "../../src/bff/routes/criticalValueV13";

const records: CriticalValueRecordV13[] = [
  { totalCount: 100, timelyHandledCount: 95, missedReportCount: 2 },
];

describe("computeCriticalValueCountV13", () => {
  // 算式：100
  it("通报数 = 100", () => {
    expect(computeCriticalValueCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeCriticalValueCountV13([])).toBe(0);
  });
});

describe("computeTimelyHandlingRateV13", () => {
  // 算式：95/100×100 = 95
  it("及时处理率 = 95%", () => {
    expect(computeTimelyHandlingRateV13(records)).toBe(95);
  });
});

describe("computeMissedReportRateV13", () => {
  // 算式：2/100×100 = 2
  it("漏报率 = 2%", () => {
    expect(computeMissedReportRateV13(records)).toBe(2);
  });
});

describe("criticalValueV13Routes 读路由", () => {
  it("GET /api/v1/critical-value-stats 路由存在且 auth:true", () => {
    const route = criticalValueV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/critical-value-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

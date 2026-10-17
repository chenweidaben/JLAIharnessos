/**
 * 健澜科技 jlmedaios - ICU 床位 V13 单测（M335-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgAPACHEIIV13,
  computeICUBedOccupancyV13,
  computeTransferOutRateV13,
  type ICURecordV13,
} from "../../src/bff/aggregators/icuOccupancyV13Aggregator";
import { icuOccupancyV13Routes } from "../../src/bff/routes/icuOccupancyV13";

const records: ICURecordV13[] = [
  { totalBedDays: 200, occupiedBedDays: 180, apacheIIScore: 15, admittedCount: 30, transferredOutCount: 25 },
  { totalBedDays: 0, occupiedBedDays: 0, apacheIIScore: 18, admittedCount: 0, transferredOutCount: 0 },
  { totalBedDays: 0, occupiedBedDays: 0, apacheIIScore: 12, admittedCount: 0, transferredOutCount: 0 },
];

describe("computeICUBedOccupancyV13", () => {
  // 算式：180/200×100 = 90
  it("占用率 = 90%", () => {
    expect(computeICUBedOccupancyV13(records)).toBe(90);
  });
  it("空态 → 0", () => {
    expect(computeICUBedOccupancyV13([])).toBe(0);
  });
});

describe("computeAvgAPACHEIIV13", () => {
  // 算式：(15+18+12)/3 = 45/3 = 15.0
  it("平均 APACHE II = 15.0", () => {
    expect(computeAvgAPACHEIIV13(records)).toBe(15.0);
  });
});

describe("computeTransferOutRateV13", () => {
  // 算式：25/30×100 ≈ 83
  it("转出率 = 83%", () => {
    expect(computeTransferOutRateV13(records)).toBe(83);
  });
});

describe("icuOccupancyV13Routes 读路由", () => {
  it("GET /api/v1/icu-occupancy 路由存在且 auth:true", () => {
    const route = icuOccupancyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/icu-occupancy",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

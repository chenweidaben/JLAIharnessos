/**
 * 健澜科技 jlmedaios - ICU 管理（统计视角）V13 单测（M454-D，M454 收官，门急诊与手术麻醉管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIcuStatsAverageLengthOfStayV13,
  computeIcuStatsBedUtilizationRateV13,
  computeIcuStatsCriticalRescueSuccessRateV13,
  type IcuStatsMgmtRecordV13,
} from "../../src/bff/aggregators/icuStatsMgmtV13Aggregator";
import { icuStatsMgmtV13Routes } from "../../src/bff/routes/icuStatsMgmtV13";

const records: IcuStatsMgmtRecordV13[] = [
  { usedBedDays: 950, authorizedBedDays: 1000, success: 900, totalCritical: 1000, icuLengthOfStay: 5.3 },
  { usedBedDays: 950, authorizedBedDays: 1000, success: 900, totalCritical: 1000, icuLengthOfStay: 6.2 },
];

describe("computeIcuStatsBedUtilizationRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("ICU 床位使用率 = 95.00%", () => {
    expect(computeIcuStatsBedUtilizationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeIcuStatsBedUtilizationRateV13([])).toBe(0);
  });
});

describe("computeIcuStatsCriticalRescueSuccessRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("危重患者抢救成功率 = 90.00%", () => {
    expect(computeIcuStatsCriticalRescueSuccessRateV13(records)).toBe(90.00);
  });
});

describe("computeIcuStatsAverageLengthOfStayV13", () => {
  // 算式：avg = (5.3+6.2)/2 = 11.5/2 = 5.75 → Math.ceil(5.75) = 6 天
  it("ICU 平均住院日 = 6 天（Math.ceil 整天）", () => {
    expect(computeIcuStatsAverageLengthOfStayV13(records)).toBe(6);
  });
});

describe("icuStatsMgmtV13Routes 读路由", () => {
  it("GET /api/v1/icu-stats-mgmt 路由存在且 auth:true", () => {
    const route = icuStatsMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/icu-stats-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

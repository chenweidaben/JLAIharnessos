/**
 * 健澜科技 jlmedaios - DRG 管理 V13 单测（M375-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrgAverageWeightV13,
  computeDrgEnrollmentRateV13,
  computeDrgProfitLossV13,
  type DRGmanagementRecordV13,
} from "../../src/bff/aggregators/DRGmanagementV13Aggregator";
import { DRGmanagementV13Routes } from "../../src/bff/routes/DRGmanagementV13";

const records: DRGmanagementRecordV13[] = [
  { dischargeCount: 1000, drgEnrolledCount: 900, averageWeight: 1.2, profitLoss: 50000 },
  { dischargeCount: 1000, drgEnrolledCount: 900, averageWeight: 1.2, profitLoss: -30000 },
];

describe("computeDrgEnrollmentRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("DRG 入组率 = 90.00%", () => {
    expect(computeDrgEnrollmentRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeDrgEnrollmentRateV13([])).toBe(0);
  });
});

describe("computeDrgAverageWeightV13", () => {
  // 算式：(1.2+1.2)/2 = 1.20
  it("DRG 平均权重 = 1.20", () => {
    expect(computeDrgAverageWeightV13(records)).toBe(1.20);
  });
});

describe("computeDrgProfitLossV13", () => {
  // 算式：50000+(-30000) = 20000.00
  it("DRG 盈亏总额 = 20000.00 元", () => {
    expect(computeDrgProfitLossV13(records)).toBe(20000.00);
  });
});

describe("DRGmanagementV13Routes 读路由", () => {
  it("GET /api/v1/drg-management 路由存在且 auth:true", () => {
    const route = DRGmanagementV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drg-management",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

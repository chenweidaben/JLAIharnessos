/**
 * 健澜科技 jlmedaios - 健康体检 V13 单测（M399-D，M399 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHealthCheckupAbnormalFollowupRateV13,
  computeHealthCheckupCountV13,
  computeHealthCheckupPackageCountV13,
  type HealthCheckupRecordV13,
} from "../../src/bff/aggregators/healthCheckupV13Aggregator";
import { healthCheckupV13Routes } from "../../src/bff/routes/healthCheckupV13";

const records: HealthCheckupRecordV13[] = [
  { checkupCount: 1000, packageCount: 10, followedAbnormalCount: 80, abnormalCount: 100 },
  { checkupCount: 1000, packageCount: 10, followedAbnormalCount: 80, abnormalCount: 100 },
];

describe("computeHealthCheckupCountV13", () => {
  // 算式：1000+1000 = 2000
  it("体检人数 = 2000 人", () => {
    expect(computeHealthCheckupCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeHealthCheckupCountV13([])).toBe(0);
  });
});

describe("computeHealthCheckupPackageCountV13", () => {
  // 算式：10+10 = 20
  it("体检套餐数 = 20 个", () => {
    expect(computeHealthCheckupPackageCountV13(records)).toBe(20);
  });
});

describe("computeHealthCheckupAbnormalFollowupRateV13", () => {
  // 算式：(80+80)/(100+100) = 160/200×100 = 80.00
  it("体检异常随访率 = 80.00%", () => {
    expect(computeHealthCheckupAbnormalFollowupRateV13(records)).toBe(80.00);
  });
});

describe("healthCheckupV13Routes 读路由", () => {
  it("GET /api/v1/health-checkup 路由存在且 auth:true", () => {
    const route = healthCheckupV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/health-checkup",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

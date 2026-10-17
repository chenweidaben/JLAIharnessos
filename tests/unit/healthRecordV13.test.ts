/**
 * 健澜科技 jlmedaios - 健康档案 V13 单测（M367-D，M367 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHealthRecordFilingRateV13,
  computeHealthRecordUpdateRateV13,
  computeHealthRecordUsageRateV13,
  type HealthRecordRecordV13,
} from "../../src/bff/aggregators/healthRecordV13Aggregator";
import { healthRecordV13Routes } from "../../src/bff/routes/healthRecordV13";

const records: HealthRecordRecordV13[] = [
  { shouldFileCount: 1000, filedCount: 800, totalRecords: 800, usedRecords: 600, updatedRecords: 700 },
  { shouldFileCount: 1000, filedCount: 800, totalRecords: 800, usedRecords: 600, updatedRecords: 700 },
];

describe("computeHealthRecordFilingRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("电子健康档案建档率 = 80.00%", () => {
    expect(computeHealthRecordFilingRateV13(records)).toBe(80.00);
  });
  it("空态 → 0", () => {
    expect(computeHealthRecordFilingRateV13([])).toBe(0);
  });
});

describe("computeHealthRecordUsageRateV13", () => {
  // 算式：(600+600)/(800+800) = 1200/1600×100 = 75.00
  it("档案使用率 = 75.00%", () => {
    expect(computeHealthRecordUsageRateV13(records)).toBe(75.00);
  });
});

describe("computeHealthRecordUpdateRateV13", () => {
  // 算式：(700+700)/(800+800) = 1400/1600×100 = 87.50
  it("档案更新率 = 87.50%", () => {
    expect(computeHealthRecordUpdateRateV13(records)).toBe(87.50);
  });
});

describe("healthRecordV13Routes 读路由", () => {
  it("GET /api/v1/health-record 路由存在且 auth:true", () => {
    const route = healthRecordV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/health-record",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

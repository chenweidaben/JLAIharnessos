/**
 * 健澜科技 jlmedaios - 服务质量 V13 单测（M386-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeServiceStandardComplianceRateV13,
  computeSmileServiceRateV13,
  computeWindowServiceHoursV13,
  type ServiceQualityRecordV13,
} from "../../src/bff/aggregators/serviceQualityV13Aggregator";
import { serviceQualityV13Routes } from "../../src/bff/routes/serviceQualityV13";

const records: ServiceQualityRecordV13[] = [
  { compliantCount: 950, totalCheckCount: 1000, windowHours: 8, smileCount: 900, totalServiceCount: 1000 },
  { compliantCount: 950, totalCheckCount: 1000, windowHours: 8, smileCount: 900, totalServiceCount: 1000 },
];

describe("computeServiceStandardComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("服务规范达标率 = 95.00%", () => {
    expect(computeServiceStandardComplianceRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeServiceStandardComplianceRateV13([])).toBe(0);
  });
});

describe("computeWindowServiceHoursV13", () => {
  // 算式：8+8 = 16
  it("窗口服务时长 = 16 小时", () => {
    expect(computeWindowServiceHoursV13(records)).toBe(16);
  });
});

describe("computeSmileServiceRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("微笑服务率 = 90.00%", () => {
    expect(computeSmileServiceRateV13(records)).toBe(90.00);
  });
});

describe("serviceQualityV13Routes 读路由", () => {
  it("GET /api/v1/service-quality 路由存在且 auth:true", () => {
    const route = serviceQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/service-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

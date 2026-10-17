/**
 * 健澜科技 jlmedaios - 消防安全明细 V13 单测（M408-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFireDrillCountV13,
  computeFireFacilityIntegrityRateV13,
  computeFireHazardRectificationRateV13,
  type FireSafetyDetailRecordV13,
} from "../../src/bff/aggregators/fireSafetyDetailV13Aggregator";
import { fireSafetyDetailV13Routes } from "../../src/bff/routes/fireSafetyDetailV13";

const records: FireSafetyDetailRecordV13[] = [
  { facilityIntact: 980, facilityTotal: 1000, drillCount: 2, hazardRectified: 95, hazardFound: 100 },
  { facilityIntact: 980, facilityTotal: 1000, drillCount: 2, hazardRectified: 95, hazardFound: 100 },
];

describe("computeFireFacilityIntegrityRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("消防设施完好率 = 98.00%", () => {
    expect(computeFireFacilityIntegrityRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeFireFacilityIntegrityRateV13([])).toBe(0);
  });
});

describe("computeFireDrillCountV13", () => {
  // 算式：2+2 = 4
  it("消防演练次数 = 4 次", () => {
    expect(computeFireDrillCountV13(records)).toBe(4);
  });
});

describe("computeFireHazardRectificationRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("火灾隐患整改率 = 95.00%", () => {
    expect(computeFireHazardRectificationRateV13(records)).toBe(95.00);
  });
});

describe("fireSafetyDetailV13Routes 读路由", () => {
  it("GET /api/v1/fire-safety-detail 路由存在且 auth:true", () => {
    const route = fireSafetyDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/fire-safety-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

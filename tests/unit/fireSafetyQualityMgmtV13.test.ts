/**
 * 健澜科技 jlmedaios - 消防安全质量管理 V13 单测（M431-C，-quality 后缀避让旧版 fireSafetyDetailV13（M408））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFireDrillCountV13,
  computeFireFacilityCompletenessRateV13,
  computeFireHazardRectificationRateV13,
  type FireSafetyQualityMgmtRecordV13,
} from "../../src/bff/aggregators/fireSafetyQualityMgmtV13Aggregator";
import { fireSafetyQualityMgmtV13Routes } from "../../src/bff/routes/fireSafetyQualityMgmtV13";

const records: FireSafetyQualityMgmtRecordV13[] = [
  { facilityIntact: 980, facilityTotal: 1000, drillCount: 4, rectified: 95, hazardTotal: 100 },
  { facilityIntact: 980, facilityTotal: 1000, drillCount: 4, rectified: 95, hazardTotal: 100 },
];

describe("computeFireFacilityCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("消防设施完好率 = 98.00%", () => {
    expect(computeFireFacilityCompletenessRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeFireFacilityCompletenessRateV13([])).toBe(0);
  });
});

describe("computeFireDrillCountV13", () => {
  // 算式：4 + 4 = 8 次（整数求和类，不是%）
  it("消防演练次数 = 8 次（整数求和类）", () => {
    expect(computeFireDrillCountV13(records)).toBe(8);
  });
});

describe("computeFireHazardRectificationRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("火灾隐患整改率 = 95.00%", () => {
    expect(computeFireHazardRectificationRateV13(records)).toBe(95.00);
  });
});

describe("fireSafetyQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/fire-safety-quality-mgmt 路由存在且 auth:true", () => {
    const route = fireSafetyQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/fire-safety-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

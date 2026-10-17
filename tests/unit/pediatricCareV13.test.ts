/**
 * 健澜科技 jlmedaios - 儿科诊疗 V13 单测（M349-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientVisitsV13,
  computeNebulizationRateV13,
  computeOutpatientVisitsV13,
  type PediatricCareRecordV13,
} from "../../src/bff/aggregators/pediatricCareV13Aggregator";
import { pediatricCareV13Routes } from "../../src/bff/routes/pediatricCareV13";

const records: PediatricCareRecordV13[] = [
  { outpatientVisits: 250, inpatientVisits: 20, nebulizationCount: 50 },
  { outpatientVisits: 250, inpatientVisits: 20, nebulizationCount: 50 },
];

describe("computeOutpatientVisitsV13", () => {
  // 算式：250+250 = 500
  it("门诊人次 = 500", () => {
    expect(computeOutpatientVisitsV13(records)).toBe(500);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientVisitsV13([])).toBe(0);
  });
});

describe("computeInpatientVisitsV13", () => {
  // 算式：20+20 = 40
  it("住院人次 = 40", () => {
    expect(computeInpatientVisitsV13(records)).toBe(40);
  });
});

describe("computeNebulizationRateV13", () => {
  // 算式：(50+50)/(250+250) = 100/500×100 = 20.00
  it("雾化治疗率 = 20.00%", () => {
    expect(computeNebulizationRateV13(records)).toBe(20.00);
  });
});

describe("pediatricCareV13Routes 读路由", () => {
  it("GET /api/v1/pediatric-care 路由存在且 auth:true", () => {
    const route = pediatricCareV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pediatric-care",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

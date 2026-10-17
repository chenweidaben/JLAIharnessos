/**
 * 健澜科技 jlmedaios - 护理质量 V13 单测（M389-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBasicNursingQualificationRateV13,
  computeNursingMeasureImplementationRateV13,
  computeSpecialNursingQualificationRateV13,
  type NursingCareQualityRecordV13,
} from "../../src/bff/aggregators/nursingCareQualityV13Aggregator";
import { nursingCareQualityV13Routes } from "../../src/bff/routes/nursingCareQualityV13";

const records: NursingCareQualityRecordV13[] = [
  { basicQualifiedCount: 950, basicInspectCount: 1000, specialQualifiedCount: 900, specialInspectCount: 1000, implementedCount: 980, shouldImplementCount: 1000 },
  { basicQualifiedCount: 950, basicInspectCount: 1000, specialQualifiedCount: 900, specialInspectCount: 1000, implementedCount: 980, shouldImplementCount: 1000 },
];

describe("computeBasicNursingQualificationRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("基础护理合格率 = 95.00%", () => {
    expect(computeBasicNursingQualificationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeBasicNursingQualificationRateV13([])).toBe(0);
  });
});

describe("computeSpecialNursingQualificationRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("特级护理合格率 = 90.00%", () => {
    expect(computeSpecialNursingQualificationRateV13(records)).toBe(90.00);
  });
});

describe("computeNursingMeasureImplementationRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("护理措施落实率 = 98.00%", () => {
    expect(computeNursingMeasureImplementationRateV13(records)).toBe(98.00);
  });
});

describe("nursingCareQualityV13Routes 读路由", () => {
  it("GET /api/v1/nursing-care-quality 路由存在且 auth:true", () => {
    const route = nursingCareQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-care-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

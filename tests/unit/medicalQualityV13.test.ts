/**
 * 健澜科技 jlmedaios - 医疗质量 V13 单测（M371-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCureRateV13,
  computeImprovementRateV13,
  computeMedicalRecordGradeARateV13,
  type MedicalQualityRecordV13,
} from "../../src/bff/aggregators/medicalQualityV13Aggregator";
import { medicalQualityV13Routes } from "../../src/bff/routes/medicalQualityV13";

const records: MedicalQualityRecordV13[] = [
  { totalRecords: 100, gradeARecords: 95, dischargeCount: 1000, curedCount: 400, improvedCount: 500 },
  { totalRecords: 100, gradeARecords: 95, dischargeCount: 1000, curedCount: 400, improvedCount: 500 },
];

describe("computeMedicalRecordGradeARateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("病案甲级率 = 95.00%", () => {
    expect(computeMedicalRecordGradeARateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalRecordGradeARateV13([])).toBe(0);
  });
});

describe("computeCureRateV13", () => {
  // 算式：(400+400)/(1000+1000) = 800/2000×100 = 40.00
  it("治愈率 = 40.00%", () => {
    expect(computeCureRateV13(records)).toBe(40.00);
  });
});

describe("computeImprovementRateV13", () => {
  // 算式：(500+500)/(1000+1000) = 1000/2000×100 = 50.00
  it("好转率 = 50.00%", () => {
    expect(computeImprovementRateV13(records)).toBe(50.00);
  });
});

describe("medicalQualityV13Routes 读路由", () => {
  it("GET /api/v1/medical-quality 路由存在且 auth:true", () => {
    const route = medicalQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

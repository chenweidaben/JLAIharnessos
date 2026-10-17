/**
 * 健澜科技 jlmedaios - 患者教育明细 V13 单测（M400-D，M400 收官，避让旧版 patientEducationV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEducationMaterialDistributionCountV13,
  computeHealthEducationSessionCountV13,
  computePatientHealthKnowledgeAwarenessRateV13,
  type PatientEducationDetailRecordV13,
} from "../../src/bff/aggregators/patientEducationDetailV13Aggregator";
import { patientEducationDetailV13Routes } from "../../src/bff/routes/patientEducationDetailV13";

const records: PatientEducationDetailRecordV13[] = [
  { sessionCount: 10, materialCount: 500, awareCount: 850, totalCount: 1000 },
  { sessionCount: 10, materialCount: 500, awareCount: 850, totalCount: 1000 },
];

describe("computeHealthEducationSessionCountV13", () => {
  // 算式：10+10 = 20
  it("健康宣教场次 = 20 场", () => {
    expect(computeHealthEducationSessionCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeHealthEducationSessionCountV13([])).toBe(0);
  });
});

describe("computeEducationMaterialDistributionCountV13", () => {
  // 算式：500+500 = 1000
  it("宣教材料发放数 = 1000 份", () => {
    expect(computeEducationMaterialDistributionCountV13(records)).toBe(1000);
  });
});

describe("computePatientHealthKnowledgeAwarenessRateV13", () => {
  // 算式：(850+850)/(1000+1000) = 1700/2000×100 = 85.00
  it("患者健康知识知晓率 = 85.00%", () => {
    expect(computePatientHealthKnowledgeAwarenessRateV13(records)).toBe(85.00);
  });
});

describe("patientEducationDetailV13Routes 读路由", () => {
  it("GET /api/v1/patient-education-detail 路由存在且 auth:true", () => {
    const route = patientEducationDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-education-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

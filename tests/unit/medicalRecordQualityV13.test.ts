/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 单测（M354-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compute7DayFilingRateV13,
  computeDRGEnrollmentRateV13,
  computeGradeARateV13,
  type MedicalRecordQualityRecordV13,
} from "../../src/bff/aggregators/medicalRecordQualityV13Aggregator";
import { medicalRecordQualityV13Routes } from "../../src/bff/routes/medicalRecordQualityV13";

const records: MedicalRecordQualityRecordV13[] = [
  { gradeACount: 95, sampledCount: 100, filedWithin7DaysCount: 180, dischargedCount: 200, drgEnrolledCount: 80, totalCaseCount: 100 },
  { gradeACount: 95, sampledCount: 100, filedWithin7DaysCount: 180, dischargedCount: 200, drgEnrolledCount: 80, totalCaseCount: 100 },
];

describe("computeGradeARateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("甲级病案率 = 95.00%", () => {
    expect(computeGradeARateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeGradeARateV13([])).toBe(0);
  });
});

describe("compute7DayFilingRateV13", () => {
  // 算式：(180+180)/(200+200) = 360/400×100 = 90.00
  it("7 日归档率 = 90.00%", () => {
    expect(compute7DayFilingRateV13(records)).toBe(90.00);
  });
});

describe("computeDRGEnrollmentRateV13", () => {
  // 算式：(80+80)/(100+100) = 160/200×100 = 80.00
  it("DRG 入组率 = 80.00%", () => {
    expect(computeDRGEnrollmentRateV13(records)).toBe(80.00);
  });
});

describe("medicalRecordQualityV13Routes 读路由", () => {
  it("GET /api/v1/medical-record-quality 路由存在且 auth:true", () => {
    const route = medicalRecordQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-record-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

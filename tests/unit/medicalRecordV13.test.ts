/**
 * 健澜科技 jlmedaios - 病案管理 V13 单测（M401-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalRecordArchivingTimelyRateV13,
  computeMedicalRecordFrontPagePassRateV13,
  computeMedicalRecordGradeARateV13,
  type MedicalRecordRecordV13,
} from "../../src/bff/aggregators/medicalRecordV13Aggregator";
import { medicalRecordV13Routes } from "../../src/bff/routes/medicalRecordV13";

const records: MedicalRecordRecordV13[] = [
  { timelyArchived: 900, totalArchived: 1000, gradeA: 850, totalRecords: 1000, passed: 950, totalChecked: 1000 },
  { timelyArchived: 900, totalArchived: 1000, gradeA: 850, totalRecords: 1000, passed: 950, totalChecked: 1000 },
];

describe("computeMedicalRecordArchivingTimelyRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("病案归档及时率 = 90.00%", () => {
    expect(computeMedicalRecordArchivingTimelyRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalRecordArchivingTimelyRateV13([])).toBe(0);
  });
});

describe("computeMedicalRecordGradeARateV13", () => {
  // 算式：(850+850)/(1000+1000) = 1700/2000×100 = 85.00
  it("病案甲级率 = 85.00%", () => {
    expect(computeMedicalRecordGradeARateV13(records)).toBe(85.00);
  });
});

describe("computeMedicalRecordFrontPagePassRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("病案首页合格率 = 95.00%", () => {
    expect(computeMedicalRecordFrontPagePassRateV13(records)).toBe(95.00);
  });
});

describe("medicalRecordV13Routes 读路由", () => {
  it("GET /api/v1/medical-record 路由存在且 auth:true", () => {
    const route = medicalRecordV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-record",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

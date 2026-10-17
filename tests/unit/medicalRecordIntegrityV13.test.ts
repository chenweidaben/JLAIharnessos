/**
 * 健澜科技 jlmedaios - 病历完整性 V13 单测（M347-D，M347 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compute72hFilingRateV13,
  computeGradeARateV13,
  computeGradeCRateV13,
  type MedicalRecordIntegrityRecordV13,
} from "../../src/bff/aggregators/medicalRecordIntegrityV13Aggregator";
import { medicalRecordIntegrityV13Routes } from "../../src/bff/routes/medicalRecordIntegrityV13";

const records: MedicalRecordIntegrityRecordV13[] = [
  { gradeACount: 48, gradeCCount: 1, sampledCount: 50, filed72hCount: 49, shouldFileCount: 50 },
  { gradeACount: 47, gradeCCount: 1, sampledCount: 50, filed72hCount: 49, shouldFileCount: 50 },
];

describe("computeGradeARateV13", () => {
  // 算式：(48+47)/(50+50) = 95/100×100 = 95.00
  it("甲级病历率 = 95.00%", () => {
    expect(computeGradeARateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeGradeARateV13([])).toBe(0);
  });
});

describe("computeGradeCRateV13", () => {
  // 算式：(1+1)/(50+50) = 2/100×100 = 2.00
  it("丙级病历率 = 2.00%", () => {
    expect(computeGradeCRateV13(records)).toBe(2.00);
  });
});

describe("compute72hFilingRateV13", () => {
  // 算式：(49+49)/(50+50) = 98/100×100 = 98.00
  it("72h 归档率 = 98.00%", () => {
    expect(compute72hFilingRateV13(records)).toBe(98.00);
  });
});

describe("medicalRecordIntegrityV13Routes 读路由", () => {
  it("GET /api/v1/medical-record-integrity 路由存在且 auth:true", () => {
    const route = medicalRecordIntegrityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-record-integrity",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

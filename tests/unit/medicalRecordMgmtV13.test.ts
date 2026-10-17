/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 单测（M413-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalRecordCopyComplianceRateV13,
  computeMedicalRecordGradeARateV13,
  computeMedicalRecordRecallTimelyRateV13,
  type MedicalRecordMgmtRecordV13,
} from "../../src/bff/aggregators/medicalRecordMgmtV13Aggregator";
import { medicalRecordMgmtV13Routes } from "../../src/bff/routes/medicalRecordMgmtV13";

const records: MedicalRecordMgmtRecordV13[] = [
  { gradeA: 950, total: 1000, timely: 98, recallTotal: 100, compliant: 99, copyTotal: 100 },
  { gradeA: 950, total: 1000, timely: 98, recallTotal: 100, compliant: 99, copyTotal: 100 },
];

describe("computeMedicalRecordGradeARateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("病案甲级率 = 95.00%", () => {
    expect(computeMedicalRecordGradeARateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalRecordGradeARateV13([])).toBe(0);
  });
});

describe("computeMedicalRecordRecallTimelyRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("病案召回及时率 = 98.00%", () => {
    expect(computeMedicalRecordRecallTimelyRateV13(records)).toBe(98.00);
  });
});

describe("computeMedicalRecordCopyComplianceRateV13", () => {
  // 算式：(99+99)/(100+100)×100 = 198/200×100 = 99.00
  it("病案复印合规率 = 99.00%", () => {
    expect(computeMedicalRecordCopyComplianceRateV13(records)).toBe(99.00);
  });
});

describe("medicalRecordMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-record-mgmt 路由存在且 auth:true", () => {
    const route = medicalRecordMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-record-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

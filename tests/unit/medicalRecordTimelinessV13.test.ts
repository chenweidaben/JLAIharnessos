/**
 * 健澜科技 jlmedaios - 病历书写及时性 V13 单测（M318-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdmissionRecordRateV13,
  computeFirstProgressRateV13,
  flagOverdueRecordsV13,
  type MedicalRecordV13,
} from "../../src/bff/aggregators/medicalRecordTimelinessV13Aggregator";
import { medicalRecordTimelinessV13Routes } from "../../src/bff/routes/medicalRecordTimelinessV13";

const records: MedicalRecordV13[] = [
  { recordId: "r1", doctorId: "D01", admissionRecordHours: 12, firstProgressHours: 4 },
  { recordId: "r2", doctorId: "D01", admissionRecordHours: 18, firstProgressHours: 6 },
  { recordId: "r3", doctorId: "D02", admissionRecordHours: 20, firstProgressHours: 5 },
  { recordId: "r4", doctorId: "D02", admissionRecordHours: 22, firstProgressHours: 7 },
  { recordId: "r5", doctorId: "D03", admissionRecordHours: 23, firstProgressHours: 8 },
  { recordId: "r6", doctorId: "D03", admissionRecordHours: 24, firstProgressHours: 8 },
  { recordId: "r7", doctorId: "D04", admissionRecordHours: 25, firstProgressHours: 9 },
  { recordId: "r8", doctorId: "D04", admissionRecordHours: 30, firstProgressHours: 10 },
  { recordId: "r9", doctorId: "D05", admissionRecordHours: 15, firstProgressHours: 5 },
  { recordId: "r10", doctorId: "D05", admissionRecordHours: 16, firstProgressHours: 6 },
];

describe("computeAdmissionRecordRateV13", () => {
  // 算式：10 记录中 admissionHours<=24 = r1-r6 + r9-r10 = 8
  // rate = 8/10×100 = 80
  it("admissionRate = 80", () => {
    expect(computeAdmissionRecordRateV13(records)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeAdmissionRecordRateV13([])).toBe(0);
  });
});

describe("computeFirstProgressRateV13", () => {
  // 算式：10 记录中 firstProgressHours<=8 = r1-r6 + r9-r10 = 8
  // 注：r7=9>8, r8=10>8
  // rate = 8/10×100 = 80
  it("firstProgressRate = 80", () => {
    expect(computeFirstProgressRateV13(records)).toBe(80);
  });
});

describe("flagOverdueRecordsV13", () => {
  // 算式：r7 admission=25>24 且 firstProgress=9>8 → 超时
  // r8 admission=30>24 且 firstProgress=10>8 → 超时
  it("超时记录 = 2（r7/r8）", () => {
    expect(flagOverdueRecordsV13(records).length).toBe(2);
  });
});

describe("medicalRecordTimelinessV13Routes 读路由", () => {
  it("GET /api/v1/medical-record-timeliness 路由存在且 auth:true", () => {
    const route = medicalRecordTimelinessV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-record-timeliness",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

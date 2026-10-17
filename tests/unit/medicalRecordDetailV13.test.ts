/**
 * 健澜科技 jlmedaios - 病案管理（细节）V13 单测（M419-A，detail 避让旧版 medicalRecordMgmtV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalRecordCodingAccuracyRateV13,
  computeMedicalRecordCopyTimelyRateV13,
  computeMedicalRecordCoverPassRateV13,
  type MedicalRecordDetailRecordV13,
} from "../../src/bff/aggregators/medicalRecordDetailV13Aggregator";
import { medicalRecordDetailV13Routes } from "../../src/bff/routes/medicalRecordDetailV13";

const records: MedicalRecordDetailRecordV13[] = [
  { coverQualified: 950, coverTotal: 1000, codingAccurate: 980, codingTotal: 1000, copyTimely: 990, copyTotal: 1000 },
  { coverQualified: 950, coverTotal: 1000, codingAccurate: 980, codingTotal: 1000, copyTimely: 990, copyTotal: 1000 },
];

describe("computeMedicalRecordCoverPassRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("病案首页合格率 = 95.00%", () => {
    expect(computeMedicalRecordCoverPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalRecordCoverPassRateV13([])).toBe(0);
  });
});

describe("computeMedicalRecordCodingAccuracyRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("病案编码准确率 = 98.00%", () => {
    expect(computeMedicalRecordCodingAccuracyRateV13(records)).toBe(98.00);
  });
});

describe("computeMedicalRecordCopyTimelyRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("病案复印及时率 = 99.00%", () => {
    expect(computeMedicalRecordCopyTimelyRateV13(records)).toBe(99.00);
  });
});

describe("medicalRecordDetailV13Routes 读路由", () => {
  it("GET /api/v1/medical-record-detail 路由存在且 auth:true", () => {
    const route = medicalRecordDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-record-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

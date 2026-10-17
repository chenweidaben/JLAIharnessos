/**
 * 健澜科技 jlmedaios - 患者隐私保护 V13 单测（M363-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePrivacyLeakCountV13,
  computePrivacyPolicyAwarenessRateV13,
  computeSensitiveDataMaskingCoverageRateV13,
  type PatientPrivacyRecordV13,
} from "../../src/bff/aggregators/patientPrivacyV13Aggregator";
import { patientPrivacyV13Routes } from "../../src/bff/routes/patientPrivacyV13";

const records: PatientPrivacyRecordV13[] = [
  { leakCount: 1, awarenessCount: 480, surveyCount: 500, maskedFields: 95, totalSensitiveFields: 100 },
  { leakCount: 1, awarenessCount: 470, surveyCount: 500, maskedFields: 95, totalSensitiveFields: 100 },
];

describe("computePrivacyLeakCountV13", () => {
  // 算式：1+1 = 2
  it("隐私泄露事件数 = 2", () => {
    expect(computePrivacyLeakCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computePrivacyLeakCountV13([])).toBe(0);
  });
});

describe("computePrivacyPolicyAwarenessRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("隐私政策知晓率 = 95.00%", () => {
    expect(computePrivacyPolicyAwarenessRateV13(records)).toBe(95.00);
  });
});

describe("computeSensitiveDataMaskingCoverageRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("敏感数据脱敏覆盖率 = 95.00%", () => {
    expect(computeSensitiveDataMaskingCoverageRateV13(records)).toBe(95.00);
  });
});

describe("patientPrivacyV13Routes 读路由", () => {
  it("GET /api/v1/patient-privacy 路由存在且 auth:true", () => {
    const route = patientPrivacyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-privacy",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

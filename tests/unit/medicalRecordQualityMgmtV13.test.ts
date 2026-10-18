/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 单测（M452-D，M452 收官，医院评审与临床质量改进组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalRecordHomepageQualifiedRateV13,
  computeMedicalRecordRecoveryTimelyRateV13,
  computeMedicalRecordWritingGradeARateV13,
  type MedicalRecordQualityMgmtRecordV13,
} from "../../src/bff/aggregators/medicalRecordQualityMgmtV13Aggregator";
import { medicalRecordQualityMgmtV13Routes } from "../../src/bff/routes/medicalRecordQualityMgmtV13";

const records: MedicalRecordQualityMgmtRecordV13[] = [
  { qualified: 950, totalHomepage: 1000, gradeA: 900, totalMedicalRecord: 1000, timely: 980, totalShouldRecover: 1000 },
  { qualified: 950, totalHomepage: 1000, gradeA: 900, totalMedicalRecord: 1000, timely: 980, totalShouldRecover: 1000 },
];

describe("computeMedicalRecordHomepageQualifiedRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("病案首页合格率 = 95.00%", () => {
    expect(computeMedicalRecordHomepageQualifiedRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalRecordHomepageQualifiedRateV13([])).toBe(0);
  });
});

describe("computeMedicalRecordWritingGradeARateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("病历书写甲级率 = 90.00%", () => {
    expect(computeMedicalRecordWritingGradeARateV13(records)).toBe(90.00);
  });
});

describe("computeMedicalRecordRecoveryTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("病案回收及时率 = 98.00%", () => {
    expect(computeMedicalRecordRecoveryTimelyRateV13(records)).toBe(98.00);
  });
});

describe("medicalRecordQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-record-quality-mgmt 路由存在且 auth:true", () => {
    const route = medicalRecordQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-record-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

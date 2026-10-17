/**
 * 健澜科技 jlmedaios - 门诊管理（细节）V13 单测（M416-C，detail 避让旧版 outpatientWait/appointment/referral/chronicDisease）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientComplaintRateV13,
  computeOutpatientMedicalRecordPassRateV13,
  computeOutpatientPrescriptionPassRateV13,
  type OutpatientMgmtDetailRecordV13,
} from "../../src/bff/aggregators/outpatientMgmtDetailV13Aggregator";
import { outpatientMgmtDetailV13Routes } from "../../src/bff/routes/outpatientMgmtDetailV13";

const records: OutpatientMgmtDetailRecordV13[] = [
  { prescriptionQualified: 950, prescriptionTotal: 1000, recordQualified: 980, outpatientRecordTotal: 1000, complaint: 10, outpatientVisitTotal: 10000 },
  { prescriptionQualified: 950, prescriptionTotal: 1000, recordQualified: 980, outpatientRecordTotal: 1000, complaint: 10, outpatientVisitTotal: 10000 },
];

describe("computeOutpatientPrescriptionPassRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("门诊处方合格率 = 95.00%", () => {
    expect(computeOutpatientPrescriptionPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientPrescriptionPassRateV13([])).toBe(0);
  });
});

describe("computeOutpatientMedicalRecordPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("门诊病历合格率 = 98.00%", () => {
    expect(computeOutpatientMedicalRecordPassRateV13(records)).toBe(98.00);
  });
});

describe("computeOutpatientComplaintRateV13", () => {
  // 算式：(10+10)/(10000+10000)×100 = 20/20000×100 = 0.10（反向指标，越低越好）
  it("门诊患者投诉率 = 0.10%（反向指标）", () => {
    expect(computeOutpatientComplaintRateV13(records)).toBe(0.10);
  });
});

describe("outpatientMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-mgmt-detail 路由存在且 auth:true", () => {
    const route = outpatientMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 医疗纠纷调解管理 V13 单测（M451-C，医患关系与投诉管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalDisputeCompensationControlRateV13,
  computeMedicalDisputeMediationSuccessRateV13,
  computeMedicalDisputeOccurrenceCountV13,
  type MedicalDisputeMediationMgmtRecordV13,
} from "../../src/bff/aggregators/medicalDisputeMediationMgmtV13Aggregator";
import { medicalDisputeMediationMgmtV13Routes } from "../../src/bff/routes/medicalDisputeMediationMgmtV13";

const records: MedicalDisputeMediationMgmtRecordV13[] = [
  { success: 950, totalDispute: 1000, actualCompensation: 300, budgetCompensation: 1000, isDispute: true },
  { success: 950, totalDispute: 1000, actualCompensation: 300, budgetCompensation: 1000, isDispute: true },
];

describe("computeMedicalDisputeMediationSuccessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("纠纷调解成功率 = 95.00%", () => {
    expect(computeMedicalDisputeMediationSuccessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalDisputeMediationSuccessRateV13([])).toBe(0);
  });
});

describe("computeMedicalDisputeCompensationControlRateV13", () => {
  // 算式：(300+300)/(1000+1000)×100 = 600/2000×100 = 30.00（反向，越低越好）
  it("赔偿金额控制率 = 30.00%（反向，越低越好）", () => {
    expect(computeMedicalDisputeCompensationControlRateV13(records)).toBe(30.00);
  });
});

describe("computeMedicalDisputeOccurrenceCountV13", () => {
  // 算式：records.filter(r => r.isDispute).length = 2 次（两条都 isDispute=true，反向，越低越好）
  it("纠纷发生数 = 2 次（反向，越低越好）", () => {
    expect(computeMedicalDisputeOccurrenceCountV13(records)).toBe(2);
  });
});

describe("medicalDisputeMediationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-dispute-mediation-mgmt 路由存在且 auth:true", () => {
    const route = medicalDisputeMediationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-dispute-mediation-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

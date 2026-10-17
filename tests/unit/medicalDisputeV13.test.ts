/**
 * 健澜科技 jlmedaios - 医疗纠纷 V13 单测（M398-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalDisputeCompensationAmountV13,
  computeMedicalDisputeCountV13,
  computeMedicalDisputeResolutionRateV13,
  type MedicalDisputeRecordV13,
} from "../../src/bff/aggregators/medicalDisputeV13Aggregator";
import { medicalDisputeV13Routes } from "../../src/bff/routes/medicalDisputeV13";

const records: MedicalDisputeRecordV13[] = [
  { disputeCount: 5, compensationAmount: 50000, resolvedCount: 4 },
  { disputeCount: 5, compensationAmount: 50000, resolvedCount: 4 },
];

describe("computeMedicalDisputeCountV13", () => {
  // 算式：5+5 = 10
  it("纠纷数 = 10 件", () => {
    expect(computeMedicalDisputeCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeMedicalDisputeCountV13([])).toBe(0);
  });
});

describe("computeMedicalDisputeCompensationAmountV13", () => {
  // 算式：50000+50000 = 100000
  it("纠纷赔偿金额 = 100000 元", () => {
    expect(computeMedicalDisputeCompensationAmountV13(records)).toBe(100000);
  });
});

describe("computeMedicalDisputeResolutionRateV13", () => {
  // 算式：(4+4)/(5+5) = 8/10×100 = 80.00
  it("纠纷化解率 = 80.00%", () => {
    expect(computeMedicalDisputeResolutionRateV13(records)).toBe(80.00);
  });
});

describe("medicalDisputeV13Routes 读路由", () => {
  it("GET /api/v1/medical-dispute 路由存在且 auth:true", () => {
    const route = medicalDisputeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-dispute",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

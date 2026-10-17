/**
 * 健澜科技 jlmedaios - 医疗安全 V13 单测（M371-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCompensationAmountV13,
  computeMedicalAdverseEventCountV13,
  computeMedicalDisputeCountV13,
  type MedicalSafetyRecordV13,
} from "../../src/bff/aggregators/medicalSafetyV13Aggregator";
import { medicalSafetyV13Routes } from "../../src/bff/routes/medicalSafetyV13";

const records: MedicalSafetyRecordV13[] = [
  { adverseEventCount: 5, disputeCount: 2, compensationAmount: 50000 },
  { adverseEventCount: 5, disputeCount: 2, compensationAmount: 50000 },
];

describe("computeMedicalAdverseEventCountV13", () => {
  // 算式：5+5 = 10
  it("医疗不良事件数 = 10", () => {
    expect(computeMedicalAdverseEventCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeMedicalAdverseEventCountV13([])).toBe(0);
  });
});

describe("computeMedicalDisputeCountV13", () => {
  // 算式：2+2 = 4
  it("医疗纠纷数 = 4", () => {
    expect(computeMedicalDisputeCountV13(records)).toBe(4);
  });
});

describe("computeCompensationAmountV13", () => {
  // 算式：50000+50000 = 100000.00
  it("赔偿金额 = 100000.00 元", () => {
    expect(computeCompensationAmountV13(records)).toBe(100000.00);
  });
});

describe("medicalSafetyV13Routes 读路由", () => {
  it("GET /api/v1/medical-safety 路由存在且 auth:true", () => {
    const route = medicalSafetyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-safety",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

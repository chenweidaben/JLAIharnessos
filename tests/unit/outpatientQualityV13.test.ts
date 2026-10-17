/**
 * 健澜科技 jlmedaios - 门诊质量 V13 单测（M372-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientAverageLodgingDaysV13,
  computeOutpatientDiagnosisConsistencyRateV13,
  computeOutpatientPrescriptionPassRateV13,
  type OutpatientQualityRecordV13,
} from "../../src/bff/aggregators/outpatientQualityV13Aggregator";
import { outpatientQualityV13Routes } from "../../src/bff/routes/outpatientQualityV13";

const records: OutpatientQualityRecordV13[] = [
  { diagnosisConsistencySample: 100, diagnosisConsistencyPass: 95, prescriptionCount: 100, prescriptionPass: 98, averageLodgingDays: 7 },
  { diagnosisConsistencySample: 100, diagnosisConsistencyPass: 95, prescriptionCount: 100, prescriptionPass: 98, averageLodgingDays: 7 },
];

describe("computeOutpatientDiagnosisConsistencyRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("门诊诊断符合率 = 95.00%", () => {
    expect(computeOutpatientDiagnosisConsistencyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientDiagnosisConsistencyRateV13([])).toBe(0);
  });
});

describe("computeOutpatientPrescriptionPassRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("门诊处方合格率 = 98.00%", () => {
    expect(computeOutpatientPrescriptionPassRateV13(records)).toBe(98.00);
  });
});

describe("computeOutpatientAverageLodgingDaysV13", () => {
  // 算式：(7+7)/2 = 7.00
  it("门诊平均住院日 = 7.00 天", () => {
    expect(computeOutpatientAverageLodgingDaysV13(records)).toBe(7.00);
  });
});

describe("outpatientQualityV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-quality 路由存在且 auth:true", () => {
    const route = outpatientQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 住院质量 V13 单测（M373-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCriticalRescueSuccessRateV13,
  computeInpatientDiagnosisConsistencyRateV13,
  computePrePostOpDiagnosisConsistencyRateV13,
  type InpatientQualityRecordV13,
} from "../../src/bff/aggregators/inpatientQualityV13Aggregator";
import { inpatientQualityV13Routes } from "../../src/bff/routes/inpatientQualityV13";

const records: InpatientQualityRecordV13[] = [
  { diagnosisConsistencySample: 100, diagnosisConsistencyPass: 98, prePostOpSample: 100, prePostOpPass: 99, criticalRescueCount: 100, criticalRescueSuccess: 90 },
  { diagnosisConsistencySample: 100, diagnosisConsistencyPass: 98, prePostOpSample: 100, prePostOpPass: 99, criticalRescueCount: 100, criticalRescueSuccess: 90 },
];

describe("computeInpatientDiagnosisConsistencyRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("住院诊断符合率 = 98.00%", () => {
    expect(computeInpatientDiagnosisConsistencyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeInpatientDiagnosisConsistencyRateV13([])).toBe(0);
  });
});

describe("computePrePostOpDiagnosisConsistencyRateV13", () => {
  // 算式：(99+99)/(100+100) = 198/200×100 = 99.00
  it("手术前后诊断符合率 = 99.00%", () => {
    expect(computePrePostOpDiagnosisConsistencyRateV13(records)).toBe(99.00);
  });
});

describe("computeCriticalRescueSuccessRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("危重抢救成功率 = 90.00%", () => {
    expect(computeCriticalRescueSuccessRateV13(records)).toBe(90.00);
  });
});

describe("inpatientQualityV13Routes 读路由", () => {
  it("GET /api/v1/inpatient-quality 路由存在且 auth:true", () => {
    const route = inpatientQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/inpatient-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

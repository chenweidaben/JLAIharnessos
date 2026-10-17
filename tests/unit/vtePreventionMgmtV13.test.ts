/**
 * 健澜科技 jlmedaios - VTE 预防管理 V13 单测（M414-D，M414 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdmissionVteRiskAssessmentRateV13,
  computeInpatientVteOccurrenceRateV13,
  computeVtePreventionMeasureImplementationRateV13,
  type VtePreventionMgmtRecordV13,
} from "../../src/bff/aggregators/vtePreventionMgmtV13Aggregator";
import { vtePreventionMgmtV13Routes } from "../../src/bff/routes/vtePreventionMgmtV13";

const records: VtePreventionMgmtRecordV13[] = [
  { assessed: 990, admissionTotal: 1000, implemented: 950, shouldPreventTotal: 1000, occurred: 10, inpatientTotal: 1000 },
  { assessed: 990, admissionTotal: 1000, implemented: 950, shouldPreventTotal: 1000, occurred: 10, inpatientTotal: 1000 },
];

describe("computeAdmissionVteRiskAssessmentRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("入院VTE风险评估率 = 99.00%", () => {
    expect(computeAdmissionVteRiskAssessmentRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computeAdmissionVteRiskAssessmentRateV13([])).toBe(0);
  });
});

describe("computeVtePreventionMeasureImplementationRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("预防措施落实率 = 95.00%", () => {
    expect(computeVtePreventionMeasureImplementationRateV13(records)).toBe(95.00);
  });
});

describe("computeInpatientVteOccurrenceRateV13", () => {
  // 算式：(10+10)/(1000+1000)×100 = 20/2000×100 = 1.00（反向指标，越低越好）
  it("住院期间VTE发生率 = 1.00%（反向指标）", () => {
    expect(computeInpatientVteOccurrenceRateV13(records)).toBe(1.00);
  });
});

describe("vtePreventionMgmtV13Routes 读路由", () => {
  it("GET /api/v1/vte-prevention-mgmt 路由存在且 auth:true", () => {
    const route = vtePreventionMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/vte-prevention-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

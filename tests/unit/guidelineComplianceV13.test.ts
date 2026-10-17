/**
 * 健澜科技 jlmedaios - 指南依从性 V13 单测（M333-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCoronaryComplianceV13,
  computeDiabetesComplianceV13,
  computeHypertensionComplianceV13,
  type GuidelineRecordV13,
} from "../../src/bff/aggregators/guidelineComplianceV13Aggregator";
import { guidelineComplianceV13Routes } from "../../src/bff/routes/guidelineComplianceV13";

const records: GuidelineRecordV13[] = [
  { disease: "高血压", totalPatients: 50, compliantPatients: 40 },
  { disease: "糖尿病", totalPatients: 30, compliantPatients: 24 },
  { disease: "冠心病", totalPatients: 20, compliantPatients: 16 },
];

describe("computeHypertensionComplianceV13", () => {
  // 算式：40/50×100 = 80
  it("高血压 = 80%", () => {
    expect(computeHypertensionComplianceV13(records)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeHypertensionComplianceV13([])).toBe(0);
  });
});

describe("computeDiabetesComplianceV13", () => {
  // 算式：24/30×100 = 80
  it("糖尿病 = 80%", () => {
    expect(computeDiabetesComplianceV13(records)).toBe(80);
  });
});

describe("computeCoronaryComplianceV13", () => {
  // 算式：16/20×100 = 80
  it("冠心病 = 80%", () => {
    expect(computeCoronaryComplianceV13(records)).toBe(80);
  });
});

describe("guidelineComplianceV13Routes 读路由", () => {
  it("GET /api/v1/guideline-compliance 路由存在且 auth:true", () => {
    const route = guidelineComplianceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/guideline-compliance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

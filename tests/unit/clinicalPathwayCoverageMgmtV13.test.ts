/**
 * 健澜科技 jlmedaios - 临床路径管理（覆盖率视角）V13 单测（M452-C，医院评审与临床质量改进组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalPathwayCoverageCompletionRateV13,
  computeClinicalPathwayCoverageEnrollmentRateV13,
  computeClinicalPathwayCoverageVariationRateV13,
  type ClinicalPathwayCoverageMgmtRecordV13,
} from "../../src/bff/aggregators/clinicalPathwayCoverageMgmtV13Aggregator";
import { clinicalPathwayCoverageMgmtV13Routes } from "../../src/bff/routes/clinicalPathwayCoverageMgmtV13";

const records: ClinicalPathwayCoverageMgmtRecordV13[] = [
  { enrolled: 950, eligible: 1000, completed: 900, enrolledTotal: 1000, variation: 30 },
  { enrolled: 950, eligible: 1000, completed: 900, enrolledTotal: 1000, variation: 30 },
];

describe("computeClinicalPathwayCoverageEnrollmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("临床路径入径率 = 95.00%", () => {
    expect(computeClinicalPathwayCoverageEnrollmentRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeClinicalPathwayCoverageEnrollmentRateV13([])).toBe(0);
  });
});

describe("computeClinicalPathwayCoverageCompletionRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("临床路径完成率 = 90.00%", () => {
    expect(computeClinicalPathwayCoverageCompletionRateV13(records)).toBe(90.00);
  });
});

describe("computeClinicalPathwayCoverageVariationRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00（反向，越低越好）
  it("临床路径变异率 = 3.00%（反向，越低越好）", () => {
    expect(computeClinicalPathwayCoverageVariationRateV13(records)).toBe(3.00);
  });
});

describe("clinicalPathwayCoverageMgmtV13Routes 读路由", () => {
  it("GET /api/v1/clinical-pathway-coverage-mgmt 路由存在且 auth:true", () => {
    const route = clinicalPathwayCoverageMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-pathway-coverage-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

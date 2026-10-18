/**
 * 健澜科技 jlmedaios - 病理质量管理 V13 单测（M430-B，-quality 后缀避让旧版 pathologyMgmtV13（M415））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePathologyDiagnosisMatchRateV13,
  computePathologyReportPassRateV13,
  computePathologySpecimenPassRateV13,
  type PathologyQualityMgmtRecordV13,
} from "../../src/bff/aggregators/pathologyQualityMgmtV13Aggregator";
import { pathologyQualityMgmtV13Routes } from "../../src/bff/routes/pathologyQualityMgmtV13";

const records: PathologyQualityMgmtRecordV13[] = [
  { reportPass: 980, reportTotal: 1000, diagnosisMatch: 950, comparisonTotal: 1000, specimenPass: 990, specimenTotal: 1000 },
  { reportPass: 980, reportTotal: 1000, diagnosisMatch: 950, comparisonTotal: 1000, specimenPass: 990, specimenTotal: 1000 },
];

describe("computePathologyReportPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("病理报告合格率 = 98.00%", () => {
    expect(computePathologyReportPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computePathologyReportPassRateV13([])).toBe(0);
  });
});

describe("computePathologyDiagnosisMatchRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("病理诊断符合率 = 95.00%", () => {
    expect(computePathologyDiagnosisMatchRateV13(records)).toBe(95.00);
  });
});

describe("computePathologySpecimenPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("病理标本合格率 = 99.00%", () => {
    expect(computePathologySpecimenPassRateV13(records)).toBe(99.00);
  });
});

describe("pathologyQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/pathology-quality-mgmt 路由存在且 auth:true", () => {
    const route = pathologyQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pathology-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

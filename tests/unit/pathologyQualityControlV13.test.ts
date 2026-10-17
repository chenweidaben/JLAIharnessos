/**
 * 健澜科技 jlmedaios - 病理质控 V13 单测（M392-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePathologyDiagnosisConcordanceRateV13,
  computePathologyReportTimelyRateV13,
  computeSpecimenQualificationRateV13,
  type PathologyQualityControlRecordV13,
} from "../../src/bff/aggregators/pathologyQualityControlV13Aggregator";
import { pathologyQualityControlV13Routes } from "../../src/bff/routes/pathologyQualityControlV13";

const records: PathologyQualityControlRecordV13[] = [
  { timelyCount: 950, reportTotalCount: 1000, concordanceCount: 900, diagnosisTotalCount: 1000, qualifiedCount: 980, specimenTotalCount: 1000 },
  { timelyCount: 950, reportTotalCount: 1000, concordanceCount: 900, diagnosisTotalCount: 1000, qualifiedCount: 980, specimenTotalCount: 1000 },
];

describe("computePathologyReportTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("病理报告及时率 = 95.00%", () => {
    expect(computePathologyReportTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePathologyReportTimelyRateV13([])).toBe(0);
  });
});

describe("computePathologyDiagnosisConcordanceRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("病理诊断符合率 = 90.00%", () => {
    expect(computePathologyDiagnosisConcordanceRateV13(records)).toBe(90.00);
  });
});

describe("computeSpecimenQualificationRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("标本合格率 = 98.00%", () => {
    expect(computeSpecimenQualificationRateV13(records)).toBe(98.00);
  });
});

describe("pathologyQualityControlV13Routes 读路由", () => {
  it("GET /api/v1/pathology-quality-control 路由存在且 auth:true", () => {
    const route = pathologyQualityControlV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pathology-quality-control",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

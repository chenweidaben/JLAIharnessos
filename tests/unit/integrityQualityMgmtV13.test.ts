/**
 * 健澜科技 jlmedaios - 廉洁行医质量管理 V13 单测（M438-B，行风廉洁与职业道德建设组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIntegrityEducationCoverageRateV13,
  computeIntegrityPetitionFilingRateV13,
  computeIntegrityViolationInvestigationRateV13,
  type IntegrityQualityMgmtRecordV13,
} from "../../src/bff/aggregators/integrityQualityMgmtV13Aggregator";
import { integrityQualityMgmtV13Routes } from "../../src/bff/routes/integrityQualityMgmtV13";

const records: IntegrityQualityMgmtRecordV13[] = [
  { trainedPeople: 950, shouldTrain: 1000, investigatedViolation: 950, totalViolation: 1000, resolvedPetition: 950, totalPetition: 1000 },
  { trainedPeople: 950, shouldTrain: 1000, investigatedViolation: 950, totalViolation: 1000, resolvedPetition: 950, totalPetition: 1000 },
];

describe("computeIntegrityEducationCoverageRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("廉洁教育培训覆盖率 = 95.00%", () => {
    expect(computeIntegrityEducationCoverageRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeIntegrityEducationCoverageRateV13([])).toBe(0);
  });
});

describe("computeIntegrityViolationInvestigationRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("违规查处率 = 95.00%", () => {
    expect(computeIntegrityViolationInvestigationRateV13(records)).toBe(95.00);
  });
});

describe("computeIntegrityPetitionFilingRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("信访举报办结率 = 95.00%", () => {
    expect(computeIntegrityPetitionFilingRateV13(records)).toBe(95.00);
  });
});

describe("integrityQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/integrity-quality-mgmt 路由存在且 auth:true", () => {
    const route = integrityQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/integrity-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

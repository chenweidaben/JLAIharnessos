/**
 * 健澜科技 jlmedaios - 临床研究明细 V13 单测（M397-C，避让旧版 clinicalResearchV13/clinicalResearchStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalTrialProjectCountV13,
  computeEthicsReviewProjectCountV13,
  computeInvestigatorInitiatedResearchCountV13,
  type ClinicalResearchDetailRecordV13,
} from "../../src/bff/aggregators/clinicalResearchDetailV13Aggregator";
import { clinicalResearchDetailV13Routes } from "../../src/bff/routes/clinicalResearchDetailV13";

const records: ClinicalResearchDetailRecordV13[] = [
  { trialCount: 10, investigatorCount: 5, ethicsCount: 15 },
  { trialCount: 10, investigatorCount: 5, ethicsCount: 15 },
];

describe("computeClinicalTrialProjectCountV13", () => {
  // 算式：10+10 = 20
  it("临床试验项目数 = 20 项", () => {
    expect(computeClinicalTrialProjectCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeClinicalTrialProjectCountV13([])).toBe(0);
  });
});

describe("computeInvestigatorInitiatedResearchCountV13", () => {
  // 算式：5+5 = 10
  it("研究者发起临床研究数 = 10 项", () => {
    expect(computeInvestigatorInitiatedResearchCountV13(records)).toBe(10);
  });
});

describe("computeEthicsReviewProjectCountV13", () => {
  // 算式：15+15 = 30
  it("伦理审查项目数 = 30 项", () => {
    expect(computeEthicsReviewProjectCountV13(records)).toBe(30);
  });
});

describe("clinicalResearchDetailV13Routes 读路由", () => {
  it("GET /api/v1/clinical-research-detail 路由存在且 auth:true", () => {
    const route = clinicalResearchDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-research-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

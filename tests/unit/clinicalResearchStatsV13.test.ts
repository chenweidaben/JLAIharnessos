/**
 * 健澜科技 jlmedaios - 临床研究 V13 单测（M355-B，stats 避让已有 clinicalResearchV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEthicsReviewCountV13,
  computeGcpProjectCountV13,
  computeSciPaperCountV13,
  type ClinicalResearchStatsRecordV13,
} from "../../src/bff/aggregators/clinicalResearchStatsV13Aggregator";
import { clinicalResearchStatsV13Routes } from "../../src/bff/routes/clinicalResearchStatsV13";

const records: ClinicalResearchStatsRecordV13[] = [
  { gcpProjectCount: 5, ethicsReviewCount: 20, sciPaperCount: 8 },
  { gcpProjectCount: 5, ethicsReviewCount: 30, sciPaperCount: 12 },
];

describe("computeGcpProjectCountV13", () => {
  // 算式：5+5 = 10
  it("GCP 在研项目数 = 10 项", () => {
    expect(computeGcpProjectCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeGcpProjectCountV13([])).toBe(0);
  });
});

describe("computeEthicsReviewCountV13", () => {
  // 算式：20+30 = 50
  it("年度伦理审查数 = 50 次", () => {
    expect(computeEthicsReviewCountV13(records)).toBe(50);
  });
});

describe("computeSciPaperCountV13", () => {
  // 算式：8+12 = 20
  it("SCI 论文产出数 = 20 篇", () => {
    expect(computeSciPaperCountV13(records)).toBe(20);
  });
});

describe("clinicalResearchStatsV13Routes 读路由", () => {
  it("GET /api/v1/clinical-research-stats 路由存在且 auth:true", () => {
    const route = clinicalResearchStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-research-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

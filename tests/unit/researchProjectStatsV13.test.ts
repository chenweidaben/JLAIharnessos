/**
 * 健澜科技 jlmedaios - 科研项目统计 V13 单测（M383-A，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeActiveResearchProjectCountV13,
  computeAnnualPaperCountV13,
  computeResearchFundingAmountV13,
  type ResearchProjectRecordV13,
} from "../../src/bff/aggregators/researchProjectStatsV13Aggregator";
import { researchProjectStatsV13Routes } from "../../src/bff/routes/researchProjectStatsV13";

const records: ResearchProjectRecordV13[] = [
  { activeProjectCount: 20, fundingAmount: 500, annualPaperCount: 100 },
  { activeProjectCount: 20, fundingAmount: 500, annualPaperCount: 100 },
];

describe("computeActiveResearchProjectCountV13", () => {
  // 算式：20+20 = 40
  it("在研课题数 = 40 项", () => {
    expect(computeActiveResearchProjectCountV13(records)).toBe(40);
  });
  it("空态 → 0", () => {
    expect(computeActiveResearchProjectCountV13([])).toBe(0);
  });
});

describe("computeResearchFundingAmountV13", () => {
  // 算式：500+500 = 1000
  it("科研经费到账金额 = 1000 万元", () => {
    expect(computeResearchFundingAmountV13(records)).toBe(1000);
  });
});

describe("computeAnnualPaperCountV13", () => {
  // 算式：100+100 = 200
  it("年度论文发表数 = 200 篇", () => {
    expect(computeAnnualPaperCountV13(records)).toBe(200);
  });
});

describe("researchProjectStatsV13Routes 读路由", () => {
  it("GET /api/v1/research-project-stats 路由存在且 auth:true", () => {
    const route = researchProjectStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/research-project-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

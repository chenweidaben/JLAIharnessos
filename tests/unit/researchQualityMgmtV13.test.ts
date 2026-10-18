/**
 * 健澜科技 jlmedaios - 科研质量管理 V13 单测（M434-B，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeResearchFundingArrivalRateV13,
  computeResearchPaperCountV13,
  computeResearchProjectCountV13,
  type ResearchQualityMgmtRecordV13,
} from "../../src/bff/aggregators/researchQualityMgmtV13Aggregator";
import { researchQualityMgmtV13Routes } from "../../src/bff/routes/researchQualityMgmtV13";

const records: ResearchQualityMgmtRecordV13[] = [
  { projectCount: 5, paperCount: 8, arrivedFunding: 950, totalFunding: 1000 },
  { projectCount: 5, paperCount: 8, arrivedFunding: 950, totalFunding: 1000 },
];

describe("computeResearchProjectCountV13", () => {
  // 算式：5 + 5 = 10 个（整数求和类）
  it("科研项目数 = 10 个（整数求和类）", () => {
    expect(computeResearchProjectCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeResearchProjectCountV13([])).toBe(0);
  });
});

describe("computeResearchPaperCountV13", () => {
  // 算式：8 + 8 = 16 篇（整数求和类）
  it("论文发表数 = 16 篇（整数求和类）", () => {
    expect(computeResearchPaperCountV13(records)).toBe(16);
  });
});

describe("computeResearchFundingArrivalRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("科研经费到账率 = 95.00%", () => {
    expect(computeResearchFundingArrivalRateV13(records)).toBe(95.00);
  });
});

describe("researchQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/research-quality-mgmt 路由存在且 auth:true", () => {
    const route = researchQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/research-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

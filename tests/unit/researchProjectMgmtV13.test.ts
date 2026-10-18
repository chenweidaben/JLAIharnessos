/**
 * 健澜科技 jlmedaios - 科研项目管理 V13 单测（M443-C，教学科研与继续教育管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeResearchProjectAchievementTransformCountV13,
  computeResearchProjectApprovedCountV13,
  computeResearchProjectFundingArrivalRateV13,
  type ResearchProjectMgmtRecordV13,
} from "../../src/bff/aggregators/researchProjectMgmtV13Aggregator";
import { researchProjectMgmtV13Routes } from "../../src/bff/routes/researchProjectMgmtV13";

const records: ResearchProjectMgmtRecordV13[] = [
  { fundingArrived: 950, shouldArrive: 1000, transformed: true },
  { fundingArrived: 950, shouldArrive: 1000, transformed: true },
];

describe("computeResearchProjectApprovedCountV13", () => {
  // 算式：records.length = 2 项（两条记录）
  it("立项项目数 = 2 项（records.length 直接返回）", () => {
    expect(computeResearchProjectApprovedCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeResearchProjectApprovedCountV13([])).toBe(0);
  });
});

describe("computeResearchProjectFundingArrivalRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("经费到位率 = 95.00%", () => {
    expect(computeResearchProjectFundingArrivalRateV13(records)).toBe(95.00);
  });
});

describe("computeResearchProjectAchievementTransformCountV13", () => {
  // 算式：records.filter(r => r.transformed).length = 2 项（两条都 transformed=true）
  it("成果转化数 = 2 项（records.filter(r => r.transformed).length）", () => {
    expect(computeResearchProjectAchievementTransformCountV13(records)).toBe(2);
  });
});

describe("researchProjectMgmtV13Routes 读路由", () => {
  it("GET /api/v1/research-project-mgmt 路由存在且 auth:true", () => {
    const route = researchProjectMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/research-project-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

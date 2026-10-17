/**
 * 健澜科技 jlmedaios - 科研管理 V13 单测（M361-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeResearchFundsReceivedV13,
  computeResearchOutcomeConversionRateV13,
  computeResearchProjectCountV13,
  type ResearchMgmtRecordV13,
} from "../../src/bff/aggregators/researchMgmtV13Aggregator";
import { researchMgmtV13Routes } from "../../src/bff/routes/researchMgmtV13";

const records: ResearchMgmtRecordV13[] = [
  { projectCount: 5, fundsReceived: 100.5, outcomeConverted: 3, outcomeTotal: 10 },
  { projectCount: 5, fundsReceived: 99.5, outcomeConverted: 2, outcomeTotal: 10 },
];

describe("computeResearchProjectCountV13", () => {
  // 算式：5+5 = 10
  it("科研项目立项数 = 10", () => {
    expect(computeResearchProjectCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeResearchProjectCountV13([])).toBe(0);
  });
});

describe("computeResearchFundsReceivedV13", () => {
  // 算式：100.5+99.5 = 200.00
  it("科研经费到账额 = 200.00 万元", () => {
    expect(computeResearchFundsReceivedV13(records)).toBe(200.00);
  });
});

describe("computeResearchOutcomeConversionRateV13", () => {
  // 算式：(3+2)/(10+10) = 5/20×100 = 25.00
  it("科研成果转化率 = 25.00%", () => {
    expect(computeResearchOutcomeConversionRateV13(records)).toBe(25.00);
  });
});

describe("researchMgmtV13Routes 读路由", () => {
  it("GET /api/v1/research-mgmt 路由存在且 auth:true", () => {
    const route = researchMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/research-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

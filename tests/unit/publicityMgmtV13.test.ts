/**
 * 健澜科技 jlmedaios - 宣传管理 V13 单测（M450-A，宣传与党建管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePublicityActivityParticipationRateV13,
  computePublicityMediaReportCountV13,
  computePublicityPlanCompletionRateV13,
  type PublicityMgmtRecordV13,
} from "../../src/bff/aggregators/publicityMgmtV13Aggregator";
import { publicityMgmtV13Routes } from "../../src/bff/routes/publicityMgmtV13";

const records: PublicityMgmtRecordV13[] = [
  { completed: 950, planned: 1000, mediaReportCount: 50, participated: 900, shouldParticipate: 1000 },
  { completed: 950, planned: 1000, mediaReportCount: 50, participated: 900, shouldParticipate: 1000 },
];

describe("computePublicityPlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("宣传计划完成率 = 95.00%", () => {
    expect(computePublicityPlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePublicityPlanCompletionRateV13([])).toBe(0);
  });
});

describe("computePublicityMediaReportCountV13", () => {
  // 算式：50+50 = 100 篇
  it("媒体报道数量 = 100 篇", () => {
    expect(computePublicityMediaReportCountV13(records)).toBe(100);
  });
});

describe("computePublicityActivityParticipationRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("宣传活动参与率 = 90.00%", () => {
    expect(computePublicityActivityParticipationRateV13(records)).toBe(90.00);
  });
});

describe("publicityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/publicity-mgmt 路由存在且 auth:true", () => {
    const route = publicityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/publicity-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

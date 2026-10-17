/**
 * 健澜科技 jlmedaios - 临床路径统计 V13 单测（M386-D，stats 避让，M386 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalPathwayCompletionRateV13,
  computeClinicalPathwayEnrollmentRateV13,
  computeClinicalPathwayVariationRateV13,
  type ClinicalPathwayRecordV13,
} from "../../src/bff/aggregators/clinicalPathwayStatsV13Aggregator";
import { clinicalPathwayStatsV13Routes } from "../../src/bff/routes/clinicalPathwayStatsV13";

const records: ClinicalPathwayRecordV13[] = [
  { enrolledCount: 800, totalEligibleCount: 1000, completedCount: 720, variationCount: 80 },
  { enrolledCount: 800, totalEligibleCount: 1000, completedCount: 720, variationCount: 80 },
];

describe("computeClinicalPathwayEnrollmentRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("入径率 = 80.00%", () => {
    expect(computeClinicalPathwayEnrollmentRateV13(records)).toBe(80.00);
  });
  it("空态 → 0", () => {
    expect(computeClinicalPathwayEnrollmentRateV13([])).toBe(0);
  });
});

describe("computeClinicalPathwayCompletionRateV13", () => {
  // 算式：(720+720)/(800+800) = 1440/1600×100 = 90.00
  it("完成率 = 90.00%", () => {
    expect(computeClinicalPathwayCompletionRateV13(records)).toBe(90.00);
  });
});

describe("computeClinicalPathwayVariationRateV13", () => {
  // 算式：(80+80)/(800+800) = 160/1600×100 = 10.00
  it("变异率 = 10.00%", () => {
    expect(computeClinicalPathwayVariationRateV13(records)).toBe(10.00);
  });
});

describe("clinicalPathwayStatsV13Routes 读路由", () => {
  it("GET /api/v1/clinical-pathway-stats 路由存在且 auth:true", () => {
    const route = clinicalPathwayStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-pathway-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

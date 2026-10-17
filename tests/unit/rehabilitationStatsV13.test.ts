/**
 * 健澜科技 jlmedaios - 康复医学 V13 单测（M350-B，stats 避让已有 rehabilitationV5/report-v2）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAssessmentCountV13,
  computeFunctionalImprovementRateV13,
  computeTherapySessionsV13,
  type RehabilitationRecordV13,
} from "../../src/bff/aggregators/rehabilitationStatsV13Aggregator";
import { rehabilitationStatsV13Routes } from "../../src/bff/routes/rehabilitationStatsV13";

const records: RehabilitationRecordV13[] = [
  { assessmentCount: 50, therapySessions: 100, improvedCount: 85 },
  { assessmentCount: 50, therapySessions: 100, improvedCount: 85 },
];

describe("computeAssessmentCountV13", () => {
  // 算式：50+50 = 100
  it("康复评定数 = 100", () => {
    expect(computeAssessmentCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeAssessmentCountV13([])).toBe(0);
  });
});

describe("computeTherapySessionsV13", () => {
  // 算式：100+100 = 200
  it("康复治疗人次 = 200", () => {
    expect(computeTherapySessionsV13(records)).toBe(200);
  });
});

describe("computeFunctionalImprovementRateV13", () => {
  // 算式：(85+85)/(100+100) = 170/200×100 = 85.00
  it("功能改善率 = 85.00%", () => {
    expect(computeFunctionalImprovementRateV13(records)).toBe(85.00);
  });
});

describe("rehabilitationStatsV13Routes 读路由", () => {
  it("GET /api/v1/rehabilitation-stats 路由存在且 auth:true", () => {
    const route = rehabilitationStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/rehabilitation-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

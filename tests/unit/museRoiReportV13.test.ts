/**
 * 健澜科技 jlmedaios - MUSE 投入产出报告 V13 单测（M321-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRoiSummaryV13,
  computeWorkHourSavedV13,
  nextMonthProjectionV13,
  type RoiHistoryV13,
  type RoiSummaryV13,
} from "../../src/bff/aggregators/museRoiReportV13Aggregator";
import { museRoiReportV13Routes } from "../../src/bff/routes/museRoiReportV13";

const summary: RoiSummaryV13 = {
  totalCalls: 10000,
  adverseEventsReduced: 50,
  adoptedSuggestions: 800,
};

const history: RoiHistoryV13[] = [
  { month: "2026-08", calls: 800 },
  { month: "2026-09", calls: 900 },
  { month: "2026-10", calls: 1000 },
];

describe("computeRoiSummaryV13", () => {
  // 算式：totalCalls=10000, workHoursSaved=10000×5/60=833, adverseEventsReduced=50, adoptedSuggestions=800
  it("roiSummary 正确", () => {
    const result = computeRoiSummaryV13(summary, 5);
    expect(result.totalCalls).toBe(10000);
    expect(result.workHoursSaved).toBe(833);
    expect(result.adverseEventsReduced).toBe(50);
    expect(result.adoptedSuggestions).toBe(800);
  });
});

describe("computeWorkHourSavedV13", () => {
  // 算式：1000×5/60 = 83.33 → round = 83
  it("1000 calls × 5 min = 83h", () => {
    expect(computeWorkHourSavedV13(1000, 5)).toBe(83);
  });
  it("空态 → 0", () => {
    expect(computeWorkHourSavedV13(0, 5)).toBe(0);
  });
});

describe("nextMonthProjectionV13", () => {
  // 算式：近3月均值 = (800+900+1000)/3 = 900
  it("nextMonthProjection = 900", () => {
    expect(nextMonthProjectionV13(history)).toBe(900);
  });
  it("空态 → 0", () => {
    expect(nextMonthProjectionV13([])).toBe(0);
  });
});

describe("museRoiReportV13Routes 读路由", () => {
  it("GET /api/v1/muse-roi-report 路由存在且 auth:true", () => {
    const route = museRoiReportV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/muse-roi-report",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

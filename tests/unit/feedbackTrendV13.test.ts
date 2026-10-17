/**
 * 健澜科技 jlmedaios - 反馈信号看板与趋势 V13 单测（M301-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateWeeklyFeedbackV13,
  computeFeedbackTrendV13,
  identifyFeedbackRiskV13,
  type WeeklyFeedbackV13,
} from "../../src/bff/aggregators/feedbackTrendV13Aggregator";
import { feedbackTrendV13Routes } from "../../src/bff/routes/feedbackTrendV13";

const weekly: WeeklyFeedbackV13[] = [
  { weekLabel: "W1", adoptionRate: 30, modificationRate: 40, rejectionRate: 30 },
  { weekLabel: "W2", adoptionRate: 35, modificationRate: 40, rejectionRate: 25 },
  { weekLabel: "W3", adoptionRate: 45, modificationRate: 35, rejectionRate: 20 },
];

describe("aggregateWeeklyFeedbackV13", () => {
  it("按 weekLabel 升序：W1 W2 W3", () => {
    const agg = aggregateWeeklyFeedbackV13(weekly);
    expect(agg[0].weekLabel).toBe("W1");
    expect(agg[2].weekLabel).toBe("W3");
  });
  it("空态 → 空数组", () => {
    expect(aggregateWeeklyFeedbackV13([]).length).toBe(0);
  });
});

describe("computeFeedbackTrendV13", () => {
  it("W3 vs W2：采纳+10 修改-5 驳回-5", () => {
    const t = computeFeedbackTrendV13(weekly[2], weekly[1]);
    expect(t.adoptionDelta).toBe(10);
    expect(t.modificationDelta).toBe(-5);
    expect(t.rejectionDelta).toBe(-5);
  });
});

describe("identifyFeedbackRiskV13", () => {
  it("W3采纳45>W2采纳35 且 驳回20<=30 → 无风险", () => {
    expect(identifyFeedbackRiskV13(weekly)).toBe("");
  });
  it("采纳率下降 → 'MUSE 表现恶化'", () => {
    const worsened: WeeklyFeedbackV13[] = [
      { weekLabel: "W1", adoptionRate: 50, modificationRate: 20, rejectionRate: 10 },
      { weekLabel: "W2", adoptionRate: 30, modificationRate: 20, rejectionRate: 10 },
    ];
    expect(identifyFeedbackRiskV13(worsened)).toContain("表现恶化");
  });
  it("驳回率>30 → '建议复训'", () => {
    const highRej: WeeklyFeedbackV13[] = [
      { weekLabel: "W1", adoptionRate: 40, modificationRate: 20, rejectionRate: 35 },
    ];
    expect(identifyFeedbackRiskV13(highRej)).toContain("建议复训");
  });
});

describe("feedbackTrendV13Routes 读路由", () => {
  it("GET /api/v1/feedback-trend 路由存在且 auth:true", () => {
    const route = feedbackTrendV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/feedback-trend",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

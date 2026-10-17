/**
 * 健澜科技 jlmedaios - 反馈闭环总览 V13 单测（M301-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFeedbackLoopOverviewV13,
  computeLoopMaturityV13,
  identifyLoopGapV13,
} from "../../src/bff/aggregators/feedbackLoopOverviewV13Aggregator";
import { feedbackLoopOverviewV13Routes } from "../../src/bff/routes/feedbackLoopOverviewV13";

describe("buildFeedbackLoopOverviewV13", () => {
  it("lastAdoption>prevAdoption → improving", () => {
    const o = buildFeedbackLoopOverviewV13(50, 8, 2, 40, 45, 35);
    expect(o.trendDirection).toBe("improving");
    expect(o.totalFeedbacks).toBe(50);
  });
  it("lastAdoption<prevAdoption → worsening", () => {
    const o = buildFeedbackLoopOverviewV13(50, 8, 2, 40, 30, 45);
    expect(o.trendDirection).toBe("worsening");
  });
  it("空态字段 → stable", () => {
    const o = buildFeedbackLoopOverviewV13(0, 0, 0, 0, 30, 30);
    expect(o.trendDirection).toBe("stable");
  });
});

describe("computeLoopMaturityV13", () => {
  it("反馈50/采纳40/补丁8/(8+2)=80 → 30+16+24=70", () => {
    const o = buildFeedbackLoopOverviewV13(50, 8, 2, 40, 45, 35);
    expect(computeLoopMaturityV13(o)).toBe(70);
  });
});

describe("identifyLoopGapV13", () => {
  it("补丁应用率80%≥50 且反馈50≥20 → 无缺口", () => {
    const o = buildFeedbackLoopOverviewV13(50, 8, 2, 40, 45, 35);
    expect(identifyLoopGapV13(o)).toBe("");
  });
  it("补丁应用率<50 → '医生修改未有效沉淀'", () => {
    const o = buildFeedbackLoopOverviewV13(50, 1, 5, 40, 45, 35);
    expect(identifyLoopGapV13(o)).toContain("医生修改未有效沉淀");
  });
  it("反馈量<20 → '反馈采集不足'", () => {
    const o = buildFeedbackLoopOverviewV13(10, 5, 0, 40, 45, 35);
    expect(identifyLoopGapV13(o)).toContain("反馈采集不足");
  });
});

describe("feedbackLoopOverviewV13Routes 读路由", () => {
  it("GET /api/v1/feedback-loop-overview 路由存在且 auth:true", () => {
    const route = feedbackLoopOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/feedback-loop-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

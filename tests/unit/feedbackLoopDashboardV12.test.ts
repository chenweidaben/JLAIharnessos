/**
 * 健澜科技 jlmedaios - 反馈闭环总览 V12 单测（M294-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFeedbackLoopDashboardV12,
  computeLoopTrendV12,
  identifyLoopBottleneckV12,
  type RetrainTaskMiniV12,
} from "../../src/bff/aggregators/feedbackLoopDashboardV12Aggregator";
import { feedbackLoopDashboardV12Routes } from "../../src/bff/routes/feedbackLoopDashboardV12";

const retrainTasks: RetrainTaskMiniV12[] = [
  { urgent: true },
  { urgent: true },
  { urgent: false },
];

describe("buildFeedbackLoopDashboardV12", () => {
  it("汇总5项：采纳率66.7/复训3/紧急2/critical2/平均健康68.2", () => {
    const d = buildFeedbackLoopDashboardV12(
      { overallAdoptionRate: 66.7 },
      retrainTasks,
      { avgScore: 68.2, criticalCount: 2 },
    );
    expect(d.overallAdoptionRate).toBe(66.7);
    expect(d.totalRetrainTasks).toBe(3);
    expect(d.urgentRetrainTasks).toBe(2);
    expect(d.criticalAgentCount).toBe(2);
    expect(d.avgHealthScore).toBe(68.2);
  });
  it("空态→全0", () => {
    const d = buildFeedbackLoopDashboardV12({ overallAdoptionRate: 0 }, [], { avgScore: 0, criticalCount: 0 });
    expect(d.totalRetrainTasks).toBe(0);
    expect(d.overallAdoptionRate).toBe(0);
  });
});

describe("computeLoopTrendV12", () => {
  it("本周-上周：采纳+6.7 / 复训+20 / 健康+8.2", () => {
    const t = computeLoopTrendV12(
      { adoptionRate: 60, retrainDoneRate: 50, healthScore: 60 },
      { adoptionRate: 66.7, retrainDoneRate: 70, healthScore: 68.2 },
    );
    expect(t.adoptionDelta).toBe(6.7);
    expect(t.retrainDelta).toBe(20);
    expect(t.healthDelta).toBe(8.2);
  });
});

describe("identifyLoopBottleneckV12", () => {
  it("采纳66.7≥60、紧急2≤2、critical2>1 → 仅 critical 过多", () => {
    const d = buildFeedbackLoopDashboardV12(
      { overallAdoptionRate: 66.7 },
      retrainTasks,
      { avgScore: 68.2, criticalCount: 2 },
    );
    const b = identifyLoopBottleneckV12(d);
    expect(b).toEqual(["健康度 critical 角色过多"]);
  });
  it("采纳<60 且 紧急>2 → 两条瓶颈", () => {
    const d = buildFeedbackLoopDashboardV12(
      { overallAdoptionRate: 40 },
      [{ urgent: true }, { urgent: true }, { urgent: true }, { urgent: true }],
      { avgScore: 50, criticalCount: 0 },
    );
    const b = identifyLoopBottleneckV12(d);
    expect(b.length).toBe(2);
  });
});

describe("feedbackLoopDashboardV12Routes 读路由", () => {
  it("GET /api/v1/feedback-loop-dashboard 路由存在且 auth:true", () => {
    const route = feedbackLoopDashboardV12Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/feedback-loop-dashboard",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

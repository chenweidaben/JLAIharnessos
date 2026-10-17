/**
 * 健澜科技 jlmedaios - 流程监控与效率分析 V6 单测（M288-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildWfMonitorV6,
  computeWfEfficiencyV6,
  computeWfSlaV6,
  type WfDailyMetric,
  type WfInstanceMetric,
} from "../../src/bff/aggregators/workflowMonitorV6Aggregator";
import { workflowMonitorV6Routes } from "../../src/bff/routes/workflowMonitorV6";

describe("computeWfSlaV6", () => {
  it("两个实例20分钟+30分钟→平均25，ceil=25", () => {
    const instances: WfInstanceMetric[] = [
      { instanceId: "i1", defId: "d", minutes: 20, overdue: false, action: "approved" },
      { instanceId: "i2", defId: "d", minutes: 30, overdue: false, action: "approved" },
    ];
    expect(computeWfSlaV6(instances).avgMinutes).toBe(25);
  });
  it("平均25.5→ceil=26", () => {
    const instances: WfInstanceMetric[] = [
      { instanceId: "i1", defId: "d", minutes: 20, overdue: false, action: "approved" },
      { instanceId: "i2", defId: "d", minutes: 31, overdue: false, action: "approved" },
    ];
    expect(computeWfSlaV6(instances).avgMinutes).toBe(26);
  });
});

describe("computeWfEfficiencyV6", () => {
  it("def-1: 通过率80% 超时率5% 效率分=80-2.5=77.5 yellow", () => {
    // passRate=80/(80+20)=0.8; overdueRate=5/100=0.05
    // score = 0.8*100 - 0.05*50 = 80 - 2.5 = 77.5
    const m: WfDailyMetric = { defId: "def-1", instanceCnt: 100, avgMinutes: 25, overdueCnt: 5, approvalCnt: 80, rejectCnt: 20 };
    const r = computeWfEfficiencyV6(m);
    expect(r.efficiencyScore).toBeCloseTo(77.5, 1);
    expect(r.grade).toBe("yellow");
  });
  it("全部通过0超时→效率分100 green", () => {
    const m: WfDailyMetric = { defId: "d", instanceCnt: 50, avgMinutes: 30, overdueCnt: 0, approvalCnt: 50, rejectCnt: 0 };
    const r = computeWfEfficiencyV6(m);
    expect(r.efficiencyScore).toBe(100);
    expect(r.grade).toBe("green");
  });
});

describe("buildWfMonitorV6", () => {
  it("2流程：总实例150，加权平均=ceil(5500/150)=37", () => {
    const metrics: WfDailyMetric[] = [
      { defId: "def-1", instanceCnt: 100, avgMinutes: 25, overdueCnt: 5, approvalCnt: 80, rejectCnt: 20 },
      { defId: "def-2", instanceCnt: 50, avgMinutes: 60, overdueCnt: 10, approvalCnt: 30, rejectCnt: 20 },
    ];
    // weighted = 25*100 + 60*50 = 2500+3000 = 5500; avg = 5500/150 = 36.67 → ceil=37
    const r = buildWfMonitorV6(metrics);
    expect(r.totalInstances).toBe(150);
    expect(r.avgMinutes).toBe(37);
    expect(r.totalOverdue).toBe(15);
  });
});

describe("workflowMonitorV6Routes 写权限", () => {
  it("POST /api/v1/workflow/monitor/snapshot 路由存在且 auth:true", () => {
    const post = workflowMonitorV6Routes.find((r) => r.method === "POST" && r.path === "/api/v1/workflow/monitor/snapshot");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});

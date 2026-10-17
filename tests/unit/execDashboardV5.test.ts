/**
 * 健澜科技 jlmedaios - 院长驾驶舱 V5 单测（M287-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExecDashboardV5,
  rankDepartmentsV5,
  vsTargetV5,
  type DeptPerf,
  type ExecKPI,
} from "../../src/bff/aggregators/execDashboardV5Aggregator";
import { execDashboardV5Routes } from "../../src/bff/routes/execDashboardV5";

describe("vsTargetV5", () => {
  it("9200/10000=92%", () => {
    expect(vsTargetV5(9200, 10000)).toBe(92);
  });
  it("520/500=104%", () => {
    expect(vsTargetV5(520, 500)).toBe(104);
  });
  it("目标为0→0", () => {
    expect(vsTargetV5(100, 0)).toBe(0);
  });
});

describe("buildExecDashboardV5", () => {
  it("8个KPI中4个达标（>=100%）", () => {
    const kpis: ExecKPI[] = [
      { name: "a", value: 9200, target: 10000, unit: "", trend: "up" },
      { name: "b", value: 520, target: 500, unit: "", trend: "up" },
      { name: "c", value: 120, target: 100, unit: "", trend: "up" },
      { name: "d", value: 1.8, target: 1.8, unit: "", trend: "flat" },
      { name: "e", value: 7.2, target: 7, unit: "", trend: "down" },
      { name: "f", value: 92, target: 95, unit: "", trend: "up" },
      { name: "g", value: 4800, target: 5000, unit: "", trend: "up" },
      { name: "h", value: 3200, target: 3500, unit: "", trend: "down" },
    ];
    const r = buildExecDashboardV5(kpis);
    expect(r.totalKpis).toBe(8);
    expect(r.onTargetCount).toBe(4);
  });
});

describe("rankDepartmentsV5", () => {
  it("按分数降序，心内科92第1", () => {
    const depts: DeptPerf[] = [
      { name: "心内科", score: 92 },
      { name: "骨科", score: 88 },
      { name: "消化内科", score: 85 },
    ];
    const r = rankDepartmentsV5(depts);
    expect(r[0].name).toBe("心内科");
    expect(r[0].rank).toBe(1);
    expect(r[2].rank).toBe(3);
  });
});

describe("execDashboardV5Routes 写权限", () => {
  it("POST /api/v1/exec-dashboard/snapshot 路由存在且 auth:true", () => {
    const post = execDashboardV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/exec-dashboard/snapshot");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});

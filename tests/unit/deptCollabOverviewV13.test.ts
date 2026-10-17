/**
 * 健澜科技 jlmedaios - 科际协作与经验共享总览 V13 单测（M308-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptCollabOverviewV13,
  computeDeptCollabScoreV13,
  identifyDeptCollabGapV13,
  type DeptCollabInputV13,
} from "../../src/bff/aggregators/deptCollabOverviewV13Aggregator";
import { deptCollabOverviewV13Routes } from "../../src/bff/routes/deptCollabOverviewV13";

const input: DeptCollabInputV13 = {
  depts: [
    { dept: "cardio", closedRate: 33, overdueCount: 1 },
    { dept: "surgery", closedRate: 0, overdueCount: 2 },
    { dept: "pediatrics", closedRate: 0, overdueCount: 0 },
  ],
  sops: [
    { dept: "cardio" },
    { dept: "cardio" },
    { dept: "surgery" },
  ],
};

describe("buildDeptCollabOverviewV13", () => {
  // 算式：totalDepts=3, avgClosedRate=(33+0+0)/3=11, totalSops=3, avgOverdue=(1+2+0)/3=1
  it("总览 = 3 科室 / 闭环11% / SOP 3 / 平均逾期1.0", () => {
    const o = buildDeptCollabOverviewV13(input);
    expect(o.totalDepts).toBe(3);
    expect(o.avgClosedRate).toBe(11);
    expect(o.totalSops).toBe(3);
    expect(o.avgOverduePerDept).toBe(1);
  });
  it("空态 → 全 0", () => {
    const o = buildDeptCollabOverviewV13({ depts: [], sops: [] });
    expect(o.totalDepts).toBe(0);
    expect(o.avgClosedRate).toBe(0);
    expect(o.totalSops).toBe(0);
  });
});

describe("computeDeptCollabScoreV13", () => {
  // 算式：closedRatio=11, avgSops=3/3=1, sopRatio=1/10*100=10, overdueRatio=1/5*100=20
  // score = 11×0.5 + 10×0.3 + (100-20)×0.2 = 5.5 + 3 + 16 = 24.5
  it("协作分 = 24.5", () => {
    const o = buildDeptCollabOverviewV13(input);
    expect(computeDeptCollabScoreV13(o)).toBe(24.5);
  });
});

describe("identifyDeptCollabGapV13", () => {
  // 算式：avgClosedRate=11 < 50 → 科室任务闭环差
  it("闭环率 11% < 50 → 科室任务闭环差", () => {
    const o = buildDeptCollabOverviewV13(input);
    expect(identifyDeptCollabGapV13(o)).toBe("科室任务闭环差");
  });
  // 算式：avgClosedRate=80 ≥ 50, totalSops=3 < 5 → SOP 沉淀不足
  it("闭环 80% 但 SOP 3 < 5 → SOP 沉淀不足", () => {
    const o = buildDeptCollabOverviewV13({
      depts: [{ dept: "a", closedRate: 80, overdueCount: 0 }],
      sops: [{ dept: "a" }, { dept: "a" }, { dept: "a" }],
    });
    expect(identifyDeptCollabGapV13(o)).toBe("SOP 沉淀不足");
  });
});

describe("deptCollabOverviewV13Routes 读路由", () => {
  it("GET /api/v1/dept-collab-overview 路由存在且 auth:true", () => {
    const route = deptCollabOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dept-collab-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

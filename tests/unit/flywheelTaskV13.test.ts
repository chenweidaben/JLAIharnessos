/**
 * 健澜科技 jlmedaios - 飞轮改进任务闭环 V13 单测（M307-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assignTaskV13,
  createFlywheelActionTaskV13,
  trackTaskProgressV13,
  type FlywheelTaskV13,
} from "../../src/bff/aggregators/flywheelTaskV13Aggregator";
import { flywheelTaskV13Routes } from "../../src/bff/routes/flywheelTaskV13";

describe("createFlywheelActionTaskV13", () => {
  it("新建任务 status=open, completed=0", () => {
    const t = createFlywheelActionTaskV13("开跨科病例讨论会", 7.5, 5);
    expect(t.status).toBe("open");
    expect(t.completedSubItems).toBe(0);
    expect(t.totalSubItems).toBe(5);
  });
});

describe("assignTaskV13", () => {
  it("指派 owner + deadline=今天+14天 ISO", () => {
    const t = createFlywheelActionTaskV13("开跨科病例讨论会", 7.5, 5);
    const assigned = assignTaskV13(t, "dr-zhang");
    expect(assigned.owner).toBe("dr-zhang");
    expect(assigned.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("trackTaskProgressV13", () => {
  // 算式：completed=2 / total=5 × 100 = 40
  it("2/5 = 40%", () => {
    const t: FlywheelTaskV13 = {
      taskId: "t", title: "x", owner: "", deadline: "",
      expectedGain: 5, status: "in_progress", completedSubItems: 2, totalSubItems: 5,
    };
    expect(trackTaskProgressV13(t)).toBe(40);
  });
  it("total=0 → 0", () => {
    const t: FlywheelTaskV13 = {
      taskId: "t", title: "x", owner: "", deadline: "",
      expectedGain: 5, status: "open", completedSubItems: 0, totalSubItems: 0,
    };
    expect(trackTaskProgressV13(t)).toBe(0);
  });
});

describe("flywheelTaskV13Routes", () => {
  it("GET /api/v1/flywheel-tasks 路由存在且 auth:true", () => {
    const get = flywheelTaskV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/flywheel-tasks",
    );
    expect(get).toBeDefined();
    expect(get?.auth).toBe(true);
  });
  it("POST /api/v1/flywheel-tasks 写路由存在且 auth:true", () => {
    const post = flywheelTaskV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/flywheel-tasks",
    );
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 任务进度追踪与升级 V13 单测（M307-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTaskFunnelV13,
  checkTaskOverdueV13,
  escalateTaskV13,
  type FlywheelTaskV13,
} from "../../src/bff/aggregators/taskFunnelV13Aggregator";
import { taskFunnelV13Routes } from "../../src/bff/routes/taskFunnelV13";

const tasks: FlywheelTaskV13[] = [
  { taskId: "t1", title: "a", owner: "dr-zhang", deadline: "2026-10-20", expectedGain: 5, status: "open", completedSubItems: 0, totalSubItems: 5 },
  { taskId: "t2", title: "b", owner: "dr-li", deadline: "2026-10-10", expectedGain: 5, status: "in_progress", completedSubItems: 2, totalSubItems: 4 },
  { taskId: "t3", title: "c", owner: "dr-wang", deadline: "2026-09-30", expectedGain: 5, status: "done", completedSubItems: 3, totalSubItems: 3 },
  { taskId: "t4", title: "d", owner: "dr-chen", deadline: "2026-10-01", expectedGain: 5, status: "escalated", completedSubItems: 1, totalSubItems: 4 },
];

describe("checkTaskOverdueV13", () => {
  // 算式：today=2026-10-17 > t2.deadline=2026-10-10 → overdue=true
  it("today > deadline → overdue", () => {
    expect(checkTaskOverdueV13(tasks[1], "2026-10-17")).toBe(true);
  });
  // 算式：today=2026-10-17 < t1.deadline=2026-10-20 → not overdue
  it("today < deadline → not overdue", () => {
    expect(checkTaskOverdueV13(tasks[0], "2026-10-17")).toBe(false);
  });
});

describe("escalateTaskV13", () => {
  it("owner 加上级后缀, status=escalated", () => {
    const e = escalateTaskV13(tasks[1]);
    expect(e.owner).toBe("dr-li（上级）");
    expect(e.status).toBe("escalated");
  });
});

describe("buildTaskFunnelV13", () => {
  // 算式：4 任务：open=1, inProgress=1, done=1, escalated=1
  it("漏斗 = [1,1,1,1]", () => {
    const f = buildTaskFunnelV13(tasks);
    expect(f.open).toBe(1);
    expect(f.inProgress).toBe(1);
    expect(f.done).toBe(1);
    expect(f.escalated).toBe(1);
  });
  it("空态 → [0,0,0,0]", () => {
    const f = buildTaskFunnelV13([]);
    expect(f.open).toBe(0);
    expect(f.inProgress).toBe(0);
    expect(f.done).toBe(0);
    expect(f.escalated).toBe(0);
  });
});

describe("taskFunnelV13Routes 读路由", () => {
  it("GET /api/v1/task-funnel 路由存在且 auth:true", () => {
    const route = taskFunnelV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/task-funnel",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

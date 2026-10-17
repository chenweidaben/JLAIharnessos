/**
 * 健澜科技 jlmedaios - 科室任务详情与督办 V13 单测（M308-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTaskDetailV13,
  computeSubItemProgressV13,
  nudgeTaskOwnerV13,
  type SubItemV13,
  type TaskHeaderV13,
  type TaskHistoryV13,
} from "../../src/bff/aggregators/deptTaskDetailV13Aggregator";
import { deptTaskDetailV13Routes } from "../../src/bff/routes/deptTaskDetailV13";

const task: TaskHeaderV13 = {
  taskId: "t1", title: "开跨科病例讨论会", owner: "dr-zhang", dept: "cardio", status: "open", nudgeCount: 0,
};

const subItems: SubItemV13[] = [
  { subItemId: "s1", label: "邀请外科室", done: true },
  { subItemId: "s2", label: "准备病例", done: true },
  { subItemId: "s3", label: "预约会议室", done: false },
  { subItemId: "s4", label: "发出通知", done: false },
  { subItemId: "s5", label: "会议纪要", done: false },
];

const history: TaskHistoryV13[] = [
  { ts: "2026-10-01", action: "创建任务", actor: "admin" },
];

describe("computeSubItemProgressV13", () => {
  // 算式：completed=2 / total=5 × 100 = 40
  it("2/5 = 40%", () => {
    expect(computeSubItemProgressV13(subItems)).toBe(40);
  });
  it("空态 → 0", () => {
    expect(computeSubItemProgressV13([])).toBe(0);
  });
});

describe("buildTaskDetailV13", () => {
  it("详情含基础 + 子项 + 历史 + progress", () => {
    const d = buildTaskDetailV13(task, subItems, history);
    expect(d.task.taskId).toBe("t1");
    expect(d.subItems.length).toBe(5);
    expect(d.history.length).toBe(1);
    expect(d.progress).toBe(40);
  });
});

describe("nudgeTaskOwnerV13", () => {
  // 算式：nudgeCount=2 → +1 = 3，未 >3 → 不升级
  it("nudge=2 → 3, 不升级", () => {
    const n = nudgeTaskOwnerV13(task, 2);
    expect(n.nudgeCount).toBe(3);
    expect(n.status).toBe("open");
  });
  // 算式：nudgeCount=3 → +1 = 4，>3 → 升级上级
  it("nudge=3 → 4, 升级上级", () => {
    const n = nudgeTaskOwnerV13(task, 3);
    expect(n.nudgeCount).toBe(4);
    expect(n.status).toBe("escalated");
    expect(n.owner).toBe("dr-zhang（上级）");
  });
});

describe("deptTaskDetailV13Routes 读路由", () => {
  it("GET /api/v1/dept-task-detail/:id 路由存在且 auth:true", () => {
    const route = deptTaskDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dept-task-detail/:id",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

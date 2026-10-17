/**
 * 健澜科技 jlmedaios - 科室间任务协作总览 V13 单测（M308-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateCrossDeptDependenciesV13,
  buildCollabRequestQueueV13,
  identifyBottleneckDeptV13,
  type CrossDeptTaskV13,
} from "../../src/bff/aggregators/deptTaskCollabV13Aggregator";
import { deptTaskCollabV13Routes } from "../../src/bff/routes/deptTaskCollabV13";

const tasks: CrossDeptTaskV13[] = [
  { taskId: "t1", title: "a", ownerDept: "cardio", dependsOnDept: "surgery", status: "pending", waitDays: 5 },
  { taskId: "t2", title: "b", ownerDept: "cardio", dependsOnDept: "radiology", status: "pending", waitDays: 3 },
  { taskId: "t3", title: "c", ownerDept: "surgery", dependsOnDept: "pathology", status: "pending", waitDays: 1 },
  { taskId: "t4", title: "d", ownerDept: "pediatrics", dependsOnDept: "cardio", status: "done", waitDays: 0 },
];

describe("aggregateCrossDeptDependenciesV13", () => {
  // 算式：surgery=1, radiology=1, pathology=1, cardio=1（done 也计入聚合）
  it("4 个被依赖科室各 1 次", () => {
    const dep = aggregateCrossDeptDependenciesV13(tasks);
    expect(dep.length).toBe(4);
    expect(dep.find((d) => d.dept === "surgery")?.waitedByCount).toBe(1);
  });
  it("空态 → []", () => {
    expect(aggregateCrossDeptDependenciesV13([]).length).toBe(0);
  });
});

describe("buildCollabRequestQueueV13", () => {
  // 算式：pending 3 个，waitDays: t1=5, t2=3, t3=1 → desc t1 → t2 → t3
  it("pending 队列按 waitDays desc", () => {
    const q = buildCollabRequestQueueV13(tasks);
    expect(q.length).toBe(3);
    expect(q[0].taskId).toBe("t1");
    expect(q[1].taskId).toBe("t2");
    expect(q[2].taskId).toBe("t3");
  });
});

describe("identifyBottleneckDeptV13", () => {
  // 算式：3 任务都依赖 cardio → cardio 被依赖 3 次 = 瓶颈
  it("cardio 被依赖 3 次 → 瓶颈", () => {
    const deps = aggregateCrossDeptDependenciesV13([
      { taskId: "x1", title: "a", ownerDept: "a", dependsOnDept: "cardio", status: "pending", waitDays: 1 },
      { taskId: "x2", title: "b", ownerDept: "b", dependsOnDept: "cardio", status: "pending", waitDays: 1 },
      { taskId: "x3", title: "c", ownerDept: "c", dependsOnDept: "cardio", status: "pending", waitDays: 1 },
    ]);
    expect(identifyBottleneckDeptV13(deps)).toBe("cardio");
  });
  it("空态 → ''", () => {
    expect(identifyBottleneckDeptV13([])).toBe("");
  });
});

describe("deptTaskCollabV13Routes 读路由", () => {
  it("GET /api/v1/dept-task-collab 路由存在且 auth:true", () => {
    const route = deptTaskCollabV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dept-task-collab",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 跨科协作任务经验双沉淀 V13 单测（M309-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCrossDeptLearningScoreV13,
  countDualSedimentV13,
  dualSedimentExperienceV13,
  type CrossDeptLearningTaskV13,
} from "../../src/bff/aggregators/crossDeptLearningV13Aggregator";
import { crossDeptLearningV13Routes } from "../../src/bff/routes/crossDeptLearningV13";

const tasks: CrossDeptLearningTaskV13[] = [
  { taskId: "t1", title: "a", deptA: "cardio", deptB: "surgery", dualSediment: true },
  { taskId: "t2", title: "b", deptA: "cardio", deptB: "radiology", dualSediment: true },
  { taskId: "t3", title: "c", deptA: "surgery", deptB: "pathology", dualSediment: true },
  { taskId: "t4", title: "d", deptA: "pediatrics", deptB: "pediatrics", dualSediment: false },
  { taskId: "t5", title: "e", deptA: "cardio", deptB: "cardio", dualSediment: false },
];

describe("dualSedimentExperienceV13", () => {
  it("写入 deptA + deptB, sedimentCount=2", () => {
    const r = dualSedimentExperienceV13({ taskId: "t1", title: "a" }, "cardio", "surgery");
    expect(r.writtenTo).toEqual(["cardio", "surgery"]);
    expect(r.sedimentCount).toBe(2);
  });
});

describe("countDualSedimentV13", () => {
  // 算式：5 任务中 dualSediment=true 的有 3 个
  it("双沉淀计数 = 3", () => {
    expect(countDualSedimentV13(tasks)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(countDualSedimentV13([])).toBe(0);
  });
});

describe("computeCrossDeptLearningScoreV13", () => {
  // 算式：3/5×100 = 60
  it("3/5 = 60", () => {
    expect(computeCrossDeptLearningScoreV13(3, 5)).toBe(60);
  });
  it("total=0 → 0", () => {
    expect(computeCrossDeptLearningScoreV13(0, 0)).toBe(0);
  });
});

describe("crossDeptLearningV13Routes 读路由", () => {
  it("GET /api/v1/cross-dept-learning 路由存在且 auth:true", () => {
    const route = crossDeptLearningV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/cross-dept-learning",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

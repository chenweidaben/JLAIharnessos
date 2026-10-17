/**
 * 健澜科技 jlmedaios - 闭环回灌飞轮 V13 单测（M307-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClosureRateV13,
  identifyLoopLeakV13,
  recomputeFlywheelAfterActionV13,
  type ClosedLoopTaskV13,
} from "../../src/bff/aggregators/closedLoopV13Aggregator";
import { closedLoopV13Routes } from "../../src/bff/routes/closedLoopV13";

const acceptedTasks: ClosedLoopTaskV13[] = [
  { taskId: "t1", title: "a", status: "done", beforeScore: 63.4, afterScore: 70.9 },
  { taskId: "t2", title: "b", status: "done", beforeScore: 63.4, afterScore: 66.5 },
];

const allTasks: ClosedLoopTaskV13[] = [
  { taskId: "t1", title: "a", status: "done", beforeScore: 63.4, afterScore: 70.9 },
  { taskId: "t2", title: "b", status: "done", beforeScore: 63.4, afterScore: 66.5 },
  { taskId: "t3", title: "c", status: "done", beforeScore: 63.4, afterScore: 65.0 },
  { taskId: "t4", title: "d", status: "open", beforeScore: 63.4, afterScore: 63.4 },
  { taskId: "t5", title: "e", status: "in_progress", beforeScore: 63.4, afterScore: 63.4 },
];

describe("recomputeFlywheelAfterActionV13", () => {
  // 算式：avgGain = ((70.9-63.4) + (66.5-63.4)) / 2 = (7.5 + 3.1) / 2 = 5.3
  // 回灌加分 = 5.3 × 0.6 = 3.18
  // newScore = 63.4 + 3.18 = 66.58 → 66.6
  it("63.4 + 5.3×0.6 = 66.6", () => {
    expect(recomputeFlywheelAfterActionV13(63.4, acceptedTasks)).toBe(66.6);
  });
  it("无 accepted → 返回原分", () => {
    const empty: ClosedLoopTaskV13[] = [];
    expect(recomputeFlywheelAfterActionV13(63.4, empty)).toBe(63.4);
  });
});

describe("computeClosureRateV13", () => {
  // 算式：3 done / 5 total × 100 = 60
  it("3/5 = 60", () => {
    expect(computeClosureRateV13(allTasks)).toBe(60);
  });
  it("空态 → 0", () => {
    expect(computeClosureRateV13([])).toBe(0);
  });
});

describe("identifyLoopLeakV13", () => {
  // 算式：closureRate=40 < 60 → 任务做完不回灌飞轮
  it("40 < 60 → 任务做完不回灌飞轮", () => {
    expect(identifyLoopLeakV13(40, false)).toBe("任务做完不回灌飞轮");
  });
  // 算式：closureRate=60 ≥ 60, hasOverdueUplifted=true → 存在任务滞留
  it("60 但有滞留 → 存在任务滞留", () => {
    expect(identifyLoopLeakV13(60, true)).toBe("存在任务滞留");
  });
});

describe("closedLoopV13Routes 读路由", () => {
  it("GET /api/v1/closed-loop-overview 路由存在且 auth:true", () => {
    const route = closedLoopV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/closed-loop-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

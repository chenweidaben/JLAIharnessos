/**
 * 健澜科技 jlmedaios - 任务验收与效果验证 V13 单测（M307-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTaskVerificationReportV13,
  rejectIfNoImprovementV13,
  verifyTaskOutcomeV13,
  type VerifiedTaskV13,
} from "../../src/bff/aggregators/taskVerificationV13Aggregator";
import { taskVerificationV13Routes } from "../../src/bff/routes/taskVerificationV13";

describe("verifyTaskOutcomeV13", () => {
  // 算式：before=63.4, expectedGain=7.5, threshold=63.4 + 7.5×0.5 = 63.4 + 3.75 = 67.15
  // after=70.9 ≥ 67.15 → accepted
  it("70.9 ≥ 67.15 → accepted", () => {
    expect(verifyTaskOutcomeV13({ expectedGain: 7.5 }, 63.4, 70.9)).toBe(true);
  });
  // 算式：before=63.4, gain=6, threshold=63.4 + 3 = 66.4
  // after=64.5 < 66.4 → not accepted
  it("64.5 < 66.4 → not accepted", () => {
    expect(verifyTaskOutcomeV13({ expectedGain: 6 }, 63.4, 64.5)).toBe(false);
  });
});

describe("rejectIfNoImprovementV13", () => {
  // 算式：after=62.0 < before=63.4 → status=rejected
  it("无改善 → rejected", () => {
    const t: VerifiedTaskV13 = {
      taskId: "t", title: "x", expectedGain: 5,
      beforeScore: 63.4, afterScore: 62.0, status: "accepted",
    };
    expect(rejectIfNoImprovementV13(t).status).toBe("rejected");
  });
  it("有改善 → 保留 accepted", () => {
    const t: VerifiedTaskV13 = {
      taskId: "t", title: "x", expectedGain: 5,
      beforeScore: 63.4, afterScore: 70.9, status: "accepted",
    };
    expect(rejectIfNoImprovementV13(t).status).toBe("accepted");
  });
});

describe("buildTaskVerificationReportV13", () => {
  // 算式：3 任务：accepted=2 (70.9-63.4=7.5, 66.5-63.4=3.1), rejected=1
  // avgGain = (7.5 + 3.1 + 0) / 3 = 10.6/3 = 3.533... → 3.5
  it("报告 accepted=2, rejected=1, avgGain≈3.5", () => {
    const tasks: VerifiedTaskV13[] = [
      { taskId: "t1", title: "a", expectedGain: 7.5, beforeScore: 63.4, afterScore: 70.9, status: "accepted" },
      { taskId: "t2", title: "b", expectedGain: 6, beforeScore: 63.4, afterScore: 66.5, status: "accepted" },
      { taskId: "t3", title: "c", expectedGain: 5, beforeScore: 63.4, afterScore: 62.0, status: "rejected" },
    ];
    const r = buildTaskVerificationReportV13(tasks);
    expect(r.acceptedCount).toBe(2);
    expect(r.rejectedCount).toBe(1);
    expect(r.avgGain).toBeCloseTo(3.5, 1);
  });
  it("空态 → [0,0,0]", () => {
    const r = buildTaskVerificationReportV13([]);
    expect(r.acceptedCount).toBe(0);
    expect(r.rejectedCount).toBe(0);
    expect(r.avgGain).toBe(0);
  });
});

describe("taskVerificationV13Routes 读路由", () => {
  it("GET /api/v1/task-verification 路由存在且 auth:true", () => {
    const route = taskVerificationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/task-verification",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

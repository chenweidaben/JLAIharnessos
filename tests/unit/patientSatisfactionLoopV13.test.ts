/**
 * 健澜科技 jlmedaios - 患者满意度闭环 V13 单测（M311-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSatisfactionClosureRateV13,
  dispatchComplaintV13,
  trackFollowUpV13,
  type ComplaintV13,
} from "../../src/bff/aggregators/patientSatisfactionLoopV13Aggregator";
import { patientSatisfactionLoopV13Routes } from "../../src/bff/routes/patientSatisfactionLoopV13";

const complaints: ComplaintV13[] = [
  { id: "c1", patientName: "张三", score: 2, resolved: true },
  { id: "c2", patientName: "李四", score: 3, resolved: true },
  { id: "c3", patientName: "王五", score: 2, resolved: true },
  { id: "c4", patientName: "赵六", score: 4, resolved: false },
  { id: "c5", patientName: "孙七", score: 5, resolved: false },
];

describe("dispatchComplaintV13", () => {
  // 算式：score=2 ≤ 3 → 派单 owner=护士长 status=open
  it("score=2 → 派单", () => {
    const d = dispatchComplaintV13(complaints[0]);
    expect(d?.owner).toBe("护士长");
    expect(d?.status).toBe("open");
  });
  it("score=4 > 3 → 不派单", () => {
    expect(dispatchComplaintV13(complaints[3])).toBeNull();
  });
});

describe("trackFollowUpV13", () => {
  it("回访 resolved → 任务 resolved", () => {
    const t = trackFollowUpV13({ complaintId: "c1", owner: "护士长", status: "open" }, "resolved");
    expect(t.status).toBe("resolved");
  });
  it("回访 unsatisfied → 仍 open", () => {
    const t = trackFollowUpV13({ complaintId: "c1", owner: "护士长", status: "open" }, "unsatisfied");
    expect(t.status).toBe("open");
  });
});

describe("computeSatisfactionClosureRateV13", () => {
  // 算式：5 差评中 resolved=true 的有 c1/c2/c3 = 3 个
  // closureRate = 3/5×100 = 60
  it("3/5 = 60", () => {
    expect(computeSatisfactionClosureRateV13(complaints)).toBe(60);
  });
  it("空态 → 0", () => {
    expect(computeSatisfactionClosureRateV13([])).toBe(0);
  });
});

describe("patientSatisfactionLoopV13Routes 读路由", () => {
  it("GET /api/v1/patient-satisfaction 路由存在且 auth:true", () => {
    const route = patientSatisfactionLoopV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-satisfaction",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

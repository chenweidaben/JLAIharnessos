/**
 * 健澜科技 jlmedaios - 管理者 Personal Agent（Manager MUSE）工作台 V8 单测（M290-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildManagerDigestV8,
  buildManagerTodoV8,
  prioritizeManagerV8,
  type ManagerApproval,
  type ManagerComplaint,
  type ManagerKpi,
} from "../../src/bff/aggregators/agentManagerV8Aggregator";
import { agentManagerV8Routes } from "../../src/bff/routes/agentManagerV8";

const kpis: ManagerKpi[] = [
  { kpiId: "k1", name: "门诊量", value: 9000, target: 10000 },
  { kpiId: "k2", name: "满意度", value: 92, target: 90 },
];

const complaints: ManagerComplaint[] = [
  { complaintId: "c-1", level: "major", title: "排队3小时" },
  { complaintId: "c-2", level: "normal", title: "停车指引" },
];

const approvals: ManagerApproval[] = [
  { approvalId: "ap-1", title: "50万设备" },
];

describe("buildManagerTodoV8", () => {
  it("k2达标不进红项，合并=1 kpiRed + 2投诉 + 1审批 = 4 条", () => {
    const todos = buildManagerTodoV8(kpis, complaints, approvals);
    expect(todos.length).toBe(4);
    expect(todos.filter((t) => t.type === "kpiRed").length).toBe(1);
  });
});

describe("prioritizeManagerV8", () => {
  it("majorComplaint > kpiRed > approval", () => {
    const todos = buildManagerTodoV8(kpis, complaints, approvals);
    const r = prioritizeManagerV8(todos);
    expect(r[0].type).toBe("majorComplaint");
    expect(r[1].type).toBe("kpiRed");
    expect(r[2].type).toBe("approval");
    expect(r[3].type).toBe("approval");
  });
});

describe("buildManagerDigestV8", () => {
  it("redKpi=1 complaint=2 major=1 approval=1", () => {
    const d = buildManagerDigestV8(kpis, complaints, approvals);
    expect(d.redKpiCount).toBe(1);
    expect(d.complaintCount).toBe(2);
    expect(d.majorComplaintCount).toBe(1);
    expect(d.pendingApprovalCount).toBe(1);
  });
  it("空态→全部为0", () => {
    const d = buildManagerDigestV8([], [], []);
    expect(d.redKpiCount).toBe(0);
    expect(d.complaintCount).toBe(0);
  });
});

describe("agentManagerV8Routes 写权限", () => {
  it("POST /api/v1/agent/manager/todo/complete 路由存在且 auth:true", () => {
    const post = agentManagerV8Routes.find((r) => r.method === "POST" && r.path === "/api/v1/agent/manager/todo/complete");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 工作流节点流转与会签 V6 单测（M288-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  advanceNodeV6,
  countSignoffV6,
  escalateTimeoutV6,
  type WfInstanceV6,
  type WfTaskV6,
} from "../../src/bff/aggregators/workflowSignoffV6Aggregator";
import { workflowSignoffV6Routes } from "../../src/bff/routes/workflowSignoffV6";

const instance: WfInstanceV6 = { id: "wf-1", currentNodeId: "n1", status: "running", requiredSignoff: 3 };

function tasksWithNApprove(n: number): WfTaskV6[] {
  const list: WfTaskV6[] = [];
  for (let i = 0; i < n; i++) {
    list.push({ id: `t${i}`, instanceId: "wf-1", nodeCode: "n1", assignee: `u${i}`, action: "approve" });
  }
  return list;
}

describe("countSignoffV6", () => {
  it("2个approve+1个pending→通过数=2", () => {
    const tasks: WfTaskV6[] = [
      { id: "t1", instanceId: "wf-1", nodeCode: "n1", assignee: "a", action: "approve" },
      { id: "t2", instanceId: "wf-1", nodeCode: "n1", assignee: "b", action: "approve" },
      { id: "t3", instanceId: "wf-1", nodeCode: "n1", assignee: "c", action: "pending" },
    ];
    expect(countSignoffV6(tasks, "n1")).toBe(2);
  });
});

describe("advanceNodeV6", () => {
  it("会签2/3未达→停留running，moved=false", () => {
    const r = advanceNodeV6(instance, tasksWithNApprove(2), "approve", "n2");
    expect(r.moved).toBe(false);
    expect(r.newStatus).toBe("running");
  });
  it("会签3/3达成且有下一节点→moved=true，running", () => {
    const r = advanceNodeV6(instance, tasksWithNApprove(3), "approve", "n2");
    expect(r.moved).toBe(true);
    expect(r.newStatus).toBe("running");
  });
  it("会签3/3达成且无下一节点→approved", () => {
    const r = advanceNodeV6(instance, tasksWithNApprove(3), "approve", null);
    expect(r.newStatus).toBe("approved");
  });
  it("reject→直接rejected", () => {
    const r = advanceNodeV6(instance, tasksWithNApprove(0), "reject", "n2");
    expect(r.newStatus).toBe("rejected");
  });
});

describe("escalateTimeoutV6", () => {
  it("now>due→escalate=true，overdue=1分钟", () => {
    const r = escalateTimeoutV6(2000, 1000);
    expect(r.escalate).toBe(true);
    expect(r.overdueMinutes).toBe(1);
  });
  it("now<=due→escalate=false", () => {
    expect(escalateTimeoutV6(500, 1000).escalate).toBe(false);
  });
});

describe("workflowSignoffV6Routes 写权限", () => {
  it("POST /api/v1/workflow/approve 路由存在且 auth:true", () => {
    const post = workflowSignoffV6Routes.find((r) => r.method === "POST" && r.path === "/api/v1/workflow/approve");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});

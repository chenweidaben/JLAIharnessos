/**
 * 健澜科技 jlmedaios - 智能审批与工作流引擎 V6 单测（M288-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildWfGraphV6,
  nextNodeV6,
  startWfV6,
  type WfDefinition,
} from "../../src/bff/aggregators/workflowV6Aggregator";
import { workflowV6Routes } from "../../src/bff/routes/workflowV6";

const leaveDef: WfDefinition = {
  id: "def-1",
  name: "请假审批",
  category: "人事",
  version: "v1",
  status: "active",
  nodes: [
    { id: "n1", name: "直属主管", role: "manager", nextOnApprove: "n2" },
    { id: "n2", name: "人事备案", role: "hr", nextOnApprove: null },
  ],
};

describe("buildWfGraphV6", () => {
  it("2节点→起=n1，终=n2", () => {
    const g = buildWfGraphV6(leaveDef.nodes);
    expect(g.nodeCount).toBe(2);
    expect(g.startNodeId).toBe("n1");
    expect(g.endNodeId).toBe("n2");
  });
});

describe("nextNodeV6", () => {
  it("n1 approve→n2 running", () => {
    const r = nextNodeV6(leaveDef, "n1", "approve");
    expect(r.nextNodeId).toBe("n2");
    expect(r.status).toBe("running");
  });
  it("n2 approve→null approved", () => {
    expect(nextNodeV6(leaveDef, "n2", "approve").status).toBe("approved");
  });
  it("任意节点 reject→rejected", () => {
    expect(nextNodeV6(leaveDef, "n1", "reject").status).toBe("rejected");
  });
});

describe("startWfV6", () => {
  it("发起后currentNode=起点n1", () => {
    const inst = startWfV6(leaveDef, "张三", "年假5天");
    expect(inst.currentNodeId).toBe("n1");
    expect(inst.status).toBe("running");
    expect(inst.applicant).toBe("张三");
  });
});

describe("workflowV6Routes 写权限", () => {
  it("POST /api/v1/workflow/start 路由存在且 auth:true", () => {
    const post = workflowV6Routes.find((r) => r.method === "POST" && r.path === "/api/v1/workflow/start");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});

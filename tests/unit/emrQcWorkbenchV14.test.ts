/**
 * 健澜科技 jlmedaios - 科室质控员工作台 V14 单测（M463-D）
 *
 * 测试 buildQcQueue 状态计数、categorizeQcTasks 优先级分组、逾期任务挑出、已 resolved 不进逾期、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQcQueue,
  categorizeQcTasks,
  type QcTaskV14,
} from "../../src/bff/aggregators/emrQcWorkbenchV14Aggregator";
import { emrQcWorkbenchV14Routes } from "../../src/bff/routes/emrQcWorkbenchV14";
import type { RouteDef } from "../../src/bff/types";

const NOW = "2026-10-18T00:00:00Z";

describe("buildQcQueue 状态计数", () => {
  // 手算：2 pending + 1 processing + 1 resolved → pending=2, processing=1, resolved=1
  it("2 pending + 1 processing + 1 resolved → 正确计数", () => {
    const tasks: QcTaskV14[] = [
      { id: "T001", title: "a", dept: "d1", priority: "high", status: "pending", dueAt: "2026-10-19T00:00:00Z" },
      { id: "T002", title: "b", dept: "d2", priority: "medium", status: "pending", dueAt: "2026-10-19T00:00:00Z" },
      { id: "T003", title: "c", dept: "d3", priority: "low", status: "processing", dueAt: "2026-10-19T00:00:00Z" },
      { id: "T004", title: "d", dept: "d4", priority: "high", status: "resolved", dueAt: "2026-10-19T00:00:00Z" },
    ];
    const queue = buildQcQueue(tasks);
    expect(queue.pending).toBe(2);
    expect(queue.processing).toBe(1);
    expect(queue.resolved).toBe(1);
  });
});

describe("categorizeQcTasks 按优先级分组", () => {
  // 手算：high=2, medium=1, low=1
  it("high=2, medium=1, low=1", () => {
    const tasks: QcTaskV14[] = [
      { id: "T001", title: "a", dept: "d1", priority: "high", status: "pending", dueAt: "2026-10-19T00:00:00Z" },
      { id: "T002", title: "b", dept: "d2", priority: "high", status: "pending", dueAt: "2026-10-19T00:00:00Z" },
      { id: "T003", title: "c", dept: "d3", priority: "medium", status: "pending", dueAt: "2026-10-19T00:00:00Z" },
      { id: "T004", title: "d", dept: "d4", priority: "low", status: "pending", dueAt: "2026-10-19T00:00:00Z" },
    ];
    const result = categorizeQcTasks(tasks, NOW);
    expect(result.byPriority.high).toBe(2);
    expect(result.byPriority.medium).toBe(1);
    expect(result.byPriority.low).toBe(1);
  });
});

describe("categorizeQcTasks 逾期任务挑出", () => {
  // 手算：T001 dueAt=2026-10-17（过去）且 status=pending → 进 overdue
  it("dueAt 在过去且未 resolved → 进 overdue", () => {
    const tasks: QcTaskV14[] = [
      { id: "T001", title: "a", dept: "d1", priority: "high", status: "pending", dueAt: "2026-10-17T00:00:00Z" },
      { id: "T002", title: "b", dept: "d2", priority: "medium", status: "pending", dueAt: "2026-10-20T00:00:00Z" },
    ];
    const result = categorizeQcTasks(tasks, NOW);
    expect(result.overdue.length).toBe(1);
    expect(result.overdue[0]?.id).toBe("T001");
  });
});

describe("categorizeQcTasks 已 resolved 的逾期任务不进 overdue", () => {
  // 手算：T001 dueAt=2026-10-16（过去）但 status=resolved → 不进 overdue
  it("已 resolved 的逾期任务不进 overdue", () => {
    const tasks: QcTaskV14[] = [
      { id: "T001", title: "a", dept: "d1", priority: "high", status: "resolved", dueAt: "2026-10-16T00:00:00Z" },
    ];
    const result = categorizeQcTasks(tasks, NOW);
    expect(result.overdue.length).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-workbench auth:true", () => {
    const def = (emrQcWorkbenchV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-workbench");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

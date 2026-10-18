/**
 * 健澜科技 jlmedaios - 病历质控整改工单管理 V14 单测（M471-A）
 *
 * 测试 buildOrder 初始状态、advanceOrderStatus 状态机推进、filterOrdersByStatus 过滤、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  advanceOrderStatus,
  buildOrder,
  filterOrdersByStatus,
  type RectificationOrderV14,
} from "../../src/bff/aggregators/emrRectificationOrderV14Aggregator";
import { emrRectificationOrderV14Routes } from "../../src/bff/routes/emrRectificationOrderV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildOrder 初始状态", () => {
  // 手算：新建工单 → status='pending'，defect/assignee 正确传入
  it("status='pending'，defect/assignee 正确", () => {
    const order = buildOrder("主诉缺失", "张三");
    expect(order.status).toBe("pending");
    expect(order.defect).toBe("主诉缺失");
    expect(order.assignee).toBe("张三");
  });
});

describe("advanceOrderStatus pending→inProgress", () => {
  // 手算：pending → inProgress（第一步推进）
  it("pending→inProgress", () => {
    const order: RectificationOrderV14 = { id: "O1", defect: "D", assignee: "A", status: "pending" };
    const next = advanceOrderStatus(order);
    expect(next.status).toBe("inProgress");
  });
});

describe("advanceOrderStatus inProgress→completed", () => {
  // 手算：inProgress → completed（第二步推进）
  it("inProgress→completed", () => {
    const order: RectificationOrderV14 = { id: "O1", defect: "D", assignee: "A", status: "inProgress" };
    const next = advanceOrderStatus(order);
    expect(next.status).toBe("completed");
  });
});

describe("advanceOrderStatus completed 终态", () => {
  // 手算：completed → completed（终态不变）
  it("completed→completed（终态不变）", () => {
    const order: RectificationOrderV14 = { id: "O1", defect: "D", assignee: "A", status: "completed" };
    const next = advanceOrderStatus(order);
    expect(next.status).toBe("completed");
  });
});

describe("filterOrdersByStatus 过滤", () => {
  // 手算：2 条 pending + 1 条 completed → filter('pending') 返回 2 条
  it("2 条 pending + 1 条 completed → filter('pending') 返回 2 条", () => {
    const orders: RectificationOrderV14[] = [
      { id: "O1", defect: "D1", assignee: "A", status: "pending" },
      { id: "O2", defect: "D2", assignee: "A", status: "pending" },
      { id: "O3", defect: "D3", assignee: "A", status: "completed" },
    ];
    const filtered = filterOrdersByStatus(orders, "pending");
    expect(filtered.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-rectification-order auth:true", () => {
    const def = (emrRectificationOrderV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-rectification-order");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

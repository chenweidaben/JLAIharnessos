/**
 * 健澜科技 jlmedaios - 质控任务派发 V14 单测（M488-A）
 *
 * 测试 buildDispatchTask 构建、assignQcTask 分配、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDispatchTask,
  assignQcTask,
  type DispatchTaskV14,
} from "../../src/bff/aggregators/emrQcTaskDispatchV14Aggregator";
import { emrQcTaskDispatchV14Routes } from "../../src/bff/routes/emrQcTaskDispatchV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDispatchTask 构建", () => {
  // 手算：recordId='MR001', reviewer='张三' → 正确构建
  it("recordId='MR001', reviewer='张三' → 正确构建", () => {
    const task: DispatchTaskV14 = buildDispatchTask("MR001", "张三");
    expect(task.recordId).toBe("MR001");
    expect(task.reviewer).toBe("张三");
  });
});

describe("assignQcTask 已派发", () => {
  // 手算：recordId='MR001', reviewer='张三' → status='已派发'
  it("recordId='MR001', reviewer='张三' → status='已派发'", () => {
    const result = assignQcTask("MR001", "张三");
    expect(result.status).toBe("已派发");
  });
});

describe("assignQcTask 不同 reviewer", () => {
  // 手算：不同 reviewer → 返回不同 reviewer
  it("不同 reviewer → 返回不同 reviewer", () => {
    const result1 = assignQcTask("MR001", "张三");
    const result2 = assignQcTask("MR002", "李四");
    expect(result1.reviewer).toBe("张三");
    expect(result2.reviewer).toBe("李四");
  });
});

describe("buildDispatchTask MR002", () => {
  // 手算：recordId='MR002' → 正确构建
  it("recordId='MR002' → 正确构建", () => {
    const task: DispatchTaskV14 = buildDispatchTask("MR002", "李四");
    expect(task.recordId).toBe("MR002");
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-task-dispatch auth:true", () => {
    const def = (emrQcTaskDispatchV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-task-dispatch");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

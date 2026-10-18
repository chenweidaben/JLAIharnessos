/**
 * 健澜科技 jlmedaios - 质控任务退回 V14 单测（M488-C）
 *
 * 测试 returnQcTask 退回、buildReturnRecord 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  returnQcTask,
  buildReturnRecord,
  type ReturnRecordV14,
} from "../../src/bff/aggregators/emrQcTaskReturnV14Aggregator";
import { emrQcTaskReturnV14Routes } from "../../src/bff/routes/emrQcTaskReturnV14";
import type { RouteDef } from "../../src/bff/types";

describe("returnQcTask T001", () => {
  // 手算：taskId='T001', reason='信息不全' → status='已退回'
  it("taskId='T001', reason='信息不全' → status='已退回'", () => {
    const result = returnQcTask("T001", "信息不全");
    expect(result.status).toBe("已退回");
  });
});

describe("returnQcTask T002", () => {
  // 手算：taskId='T002', reason='格式错误' → status='已退回'
  it("taskId='T002', reason='格式错误' → status='已退回'", () => {
    const result = returnQcTask("T002", "格式错误");
    expect(result.status).toBe("已退回");
  });
});

describe("buildReturnRecord T001", () => {
  // 手算：taskId='T001', reason='信息不全', reviewer='赵六' → 正确构建
  it("taskId='T001', reason='信息不全', reviewer='赵六' → 正确构建", () => {
    const record: ReturnRecordV14 = buildReturnRecord("T001", "信息不全", "赵六");
    expect(record.taskId).toBe("T001");
    expect(record.reason).toBe("信息不全");
    expect(record.reviewer).toBe("赵六");
  });
});

describe("buildReturnRecord T003", () => {
  // 手算：taskId='T003', reason='内容缺失', reviewer='钱七' → 正确构建
  it("taskId='T003', reason='内容缺失', reviewer='钱七' → 正确构建", () => {
    const record: ReturnRecordV14 = buildReturnRecord("T003", "内容缺失", "钱七");
    expect(record.taskId).toBe("T003");
    expect(record.reason).toBe("内容缺失");
    expect(record.reviewer).toBe("钱七");
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-task-return auth:true", () => {
    const def = (emrQcTaskReturnV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-task-return");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

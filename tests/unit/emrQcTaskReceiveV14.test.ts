/**
 * 健澜科技 jlmedaios - 质控任务签收 V14 单测（M488-B）
 *
 * 测试 receiveQcTask 签收、buildReceiveRecord 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  receiveQcTask,
  buildReceiveRecord,
  type ReceiveRecordV14,
} from "../../src/bff/aggregators/emrQcTaskReceiveV14Aggregator";
import { emrQcTaskReceiveV14Routes } from "../../src/bff/routes/emrQcTaskReceiveV14";
import type { RouteDef } from "../../src/bff/types";

describe("receiveQcTask T001", () => {
  // 手算：taskId='T001' → status='已签收'
  it("taskId='T001' → status='已签收'", () => {
    const result = receiveQcTask("T001");
    expect(result.status).toBe("已签收");
  });
});

describe("receiveQcTask T002", () => {
  // 手算：taskId='T002' → status='已签收'
  it("taskId='T002' → status='已签收'", () => {
    const result = receiveQcTask("T002");
    expect(result.status).toBe("已签收");
  });
});

describe("buildReceiveRecord T001", () => {
  // 手算：taskId='T001', reviewer='李四' → 正确构建
  it("taskId='T001', reviewer='李四' → 正确构建", () => {
    const record: ReceiveRecordV14 = buildReceiveRecord("T001", "李四");
    expect(record.taskId).toBe("T001");
    expect(record.reviewer).toBe("李四");
  });
});

describe("buildReceiveRecord T003", () => {
  // 手算：taskId='T003', reviewer='王五' → 正确构建
  it("taskId='T003', reviewer='王五' → 正确构建", () => {
    const record: ReceiveRecordV14 = buildReceiveRecord("T003", "王五");
    expect(record.taskId).toBe("T003");
    expect(record.reviewer).toBe("王五");
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-task-receive auth:true", () => {
    const def = (emrQcTaskReceiveV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-task-receive");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

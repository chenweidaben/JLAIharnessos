/**
 * 健澜科技 jlmedaios - 质控任务归档 V14 单测（M488-D，M488 收官）
 *
 * 测试 archiveQcTask 归档、buildArchiveRecord 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  archiveQcTask,
  buildArchiveRecord,
  type ArchiveRecordV14,
} from "../../src/bff/aggregators/emrQcTaskArchiveV14Aggregator";
import { emrQcTaskArchiveV14Routes } from "../../src/bff/routes/emrQcTaskArchiveV14";
import type { RouteDef } from "../../src/bff/types";

describe("archiveQcTask T001", () => {
  // 手算：taskId='T001' → status='已归档'
  it("taskId='T001' → status='已归档'", () => {
    const result = archiveQcTask("T001");
    expect(result.status).toBe("已归档");
  });
});

describe("archiveQcTask T002", () => {
  // 手算：taskId='T002' → status='已归档'
  it("taskId='T002' → status='已归档'", () => {
    const result = archiveQcTask("T002");
    expect(result.status).toBe("已归档");
  });
});

describe("buildArchiveRecord T001", () => {
  // 手算：taskId='T001', reviewer='张三', result='合格' → 正确构建
  it("taskId='T001', reviewer='张三', result='合格' → 正确构建", () => {
    const record: ArchiveRecordV14 = buildArchiveRecord("T001", "张三", "合格");
    expect(record.taskId).toBe("T001");
    expect(record.reviewer).toBe("张三");
    expect(record.result).toBe("合格");
  });
});

describe("buildArchiveRecord T003", () => {
  // 手算：taskId='T003', reviewer='李四', result='整改后合格' → 正确构建
  it("taskId='T003', reviewer='李四', result='整改后合格' → 正确构建", () => {
    const record: ArchiveRecordV14 = buildArchiveRecord("T003", "李四", "整改后合格");
    expect(record.taskId).toBe("T003");
    expect(record.reviewer).toBe("李四");
    expect(record.result).toBe("整改后合格");
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-task-archive auth:true", () => {
    const def = (emrQcTaskArchiveV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-task-archive");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

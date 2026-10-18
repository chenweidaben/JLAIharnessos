/**
 * 健澜科技 jlmedaios - 病历复印申请 V14 单测（M482-A）
 *
 * 测试 buildCopyRequest 构建、approveCopyRequest 审批、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  approveCopyRequest,
  buildCopyRequest,
  type CopyRequestV14,
} from "../../src/bff/aggregators/emrCopyRequestV14Aggregator";
import { emrCopyRequestV14Routes } from "../../src/bff/routes/emrCopyRequestV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildCopyRequest 构建", () => {
  // 手算：patientName='张三', purpose='保险理赔', copies=3 → 正确构建
  it("patientName=张三, purpose=保险理赔, copies=3 → 正确构建", () => {
    const request: CopyRequestV14 = buildCopyRequest("张三", "保险理赔", 3);
    expect(request.patientName).toBe("张三");
    expect(request.purpose).toBe("保险理赔");
    expect(request.copies).toBe(3);
  });
});

describe("approveCopyRequest 已批准", () => {
  // 手算：approved=true → status='已批准'
  it("approved=true → status=已批准", () => {
    const request: CopyRequestV14 = buildCopyRequest("张三", "保险理赔", 3);
    const status = approveCopyRequest(request, true);
    expect(status.status).toBe("已批准");
  });
});

describe("approveCopyRequest 已拒绝", () => {
  // 手算：approved=false → status='已拒绝'
  it("approved=false → status=已拒绝", () => {
    const request: CopyRequestV14 = buildCopyRequest("张三", "保险理赔", 3);
    const status = approveCopyRequest(request, false);
    expect(status.status).toBe("已拒绝");
  });
});

describe("buildCopyRequest 1份", () => {
  // 手算：copies=1 → 正确构建
  it("copies=1 → 正确构建", () => {
    const request: CopyRequestV14 = buildCopyRequest("李四", "工伤鉴定", 1);
    expect(request.copies).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-copy-request auth:true", () => {
    const def = (emrCopyRequestV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-copy-request");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

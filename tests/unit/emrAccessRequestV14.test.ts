/**
 * 健澜科技 jlmedaios - 病历调阅申请审批 V14 单测（M534-A）
 *
 * 测试 buildAccessRequest 构建调阅申请、approveAccessRequest 调阅审批、buildAccessRequestReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAccessRequest,
  buildAccessRequestReport,
  approveAccessRequest,
  type AccessRequestInputV14,
} from "../../src/bff/aggregators/emrAccessRequestV14Aggregator";
import { emrAccessRequestV14Routes } from "../../src/bff/routes/emrAccessRequestV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAccessRequest 构建调阅申请", () => {
  // 手算：recordId='REC100', applicant='张医生' → 正确构建
  it("recordId='REC100', applicant='张医生' → 正确构建", () => {
    const req = buildAccessRequest("REC100", "张医生");
    expect(req.recordId).toBe("REC100");
    expect(req.applicant).toBe("张医生");
  });
});

describe("approveAccessRequest 批准", () => {
  // 手算：{requestId='REQ001', decision='批准', reason='科研需要'}
  // 手算：decision='批准' → approved=true, action='已批准调阅'
  it("{requestId='REQ001', decision='批准', reason='科研需要'} → approved=true, action='已批准调阅'", () => {
    const input: AccessRequestInputV14 = { requestId: "REQ001", decision: "批准", reason: "科研需要" };
    const result = approveAccessRequest(input);
    expect(result.approved).toBe(true);
    expect(result.action).toBe("已批准调阅");
  });
});

describe("approveAccessRequest 拒绝", () => {
  // 手算：{requestId='REQ002', decision='拒绝', reason='无关人员'}
  // 手算：decision='拒绝' → approved=false, action='已拒绝调阅'
  it("{requestId='REQ002', decision='拒绝', reason='无关人员'} → approved=false, action='已拒绝调阅'", () => {
    const input: AccessRequestInputV14 = { requestId: "REQ002", decision: "拒绝", reason: "无关人员" };
    const result = approveAccessRequest(input);
    expect(result.approved).toBe(false);
    expect(result.action).toBe("已拒绝调阅");
  });
});

describe("buildAccessRequestReport 构建报告", () => {
  // 手算：{approved=true, action='已批准调阅'}
  // 手算：透传 approved + action
  it("{approved=true, action='已批准调阅'} → 正确返回（透传）", () => {
    const report = buildAccessRequestReport({ approved: true, action: "已批准调阅" });
    expect(report.approved).toBe(true);
    expect(report.action).toBe("已批准调阅");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-access-request auth:true", () => {
    const def = (emrAccessRequestV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-access-request");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

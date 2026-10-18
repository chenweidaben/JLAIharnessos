/**
 * 健澜科技 jlmedaios - 质控移动端审批 V14 单测（M526-A）
 *
 * 测试 buildMobileApproval 构建审批、approveOnMobile 移动端审批、buildMobileApprovalReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMobileApproval,
  buildMobileApprovalReport,
  approveOnMobile,
  type MobileApprovalInputV14,
} from "../../src/bff/aggregators/emrQcMobileApprovalV14Aggregator";
import { emrQcMobileApprovalV14Routes } from "../../src/bff/routes/emrQcMobileApprovalV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMobileApproval 构建审批", () => {
  // 手算：defectId='D020', approver='张医生' → 正确构建
  it("defectId='D020', approver='张医生' → 正确构建", () => {
    const approval = buildMobileApproval("D020", "张医生");
    expect(approval.defectId).toBe("D020");
    expect(approval.approver).toBe("张医生");
  });
});

describe("approveOnMobile 通过", () => {
  // 手算：{defectId:'D020', decision:'通过', comment:'符合规范'}
  // 手算：decision='通过' → approved=true, action='移动端通过'
  it("{defectId:'D020', decision:'通过', comment:'符合规范'} → approved=true, action='移动端通过'", () => {
    const input: MobileApprovalInputV14 = { defectId: "D020", decision: "通过", comment: "符合规范" };
    const result = approveOnMobile(input);
    expect(result.approved).toBe(true);
    expect(result.action).toBe("移动端通过");
  });
});

describe("approveOnMobile 驳回", () => {
  // 手算：{defectId:'D021', decision:'驳回', comment:'缺少病程记录'}
  // 手算：decision='驳回' → approved=false, action='移动端驳回'
  it("{defectId:'D021', decision:'驳回', comment:'缺少病程记录'} → approved=false, action='移动端驳回'", () => {
    const input: MobileApprovalInputV14 = { defectId: "D021", decision: "驳回", comment: "缺少病程记录" };
    const result = approveOnMobile(input);
    expect(result.approved).toBe(false);
    expect(result.action).toBe("移动端驳回");
  });
});

describe("buildMobileApprovalReport 构建报告", () => {
  // 手算：{approved:true, action:'移动端通过'}
  // 手算：透传 approved + action
  it("{approved:true, action:'移动端通过'} → 正确返回（透传）", () => {
    const report = buildMobileApprovalReport({ approved: true, action: "移动端通过" });
    expect(report.approved).toBe(true);
    expect(report.action).toBe("移动端通过");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-mobile-approval auth:true", () => {
    const def = (emrQcMobileApprovalV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-mobile-approval");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

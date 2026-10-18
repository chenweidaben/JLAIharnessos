/**
 * 健澜科技 jlmedaios - 模板审批流程 V14 单测（M524-D，M524 收官）
 *
 * 测试 buildTemplateApproval 构建审批、submitApproval 提交审批、buildTemplateApprovalReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTemplateApproval,
  buildTemplateApprovalReport,
  submitApproval,
  type TemplateApprovalInputV14,
} from "../../src/bff/aggregators/emrTemplateApprovalV14Aggregator";
import { emrTemplateApprovalV14Routes } from "../../src/bff/routes/emrTemplateApprovalV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTemplateApproval 构建审批", () => {
  // 手算：templateName='入院记录模板v3.0', submitter='张医生' → 正确构建
  it("templateName='入院记录模板v3.0', submitter='张医生' → 正确构建", () => {
    const approval = buildTemplateApproval("入院记录模板v3.0", "张医生");
    expect(approval.templateName).toBe("入院记录模板v3.0");
    expect(approval.submitter).toBe("张医生");
  });
});

describe("submitApproval 紧急", () => {
  // 手算：input={templateName:'入院记录模板v3.0', submitter:'张医生', urgency:'紧急'}
  // 手算：status='待审批'
  // 手算：urgency='紧急' → estimatedDays=1
  it("input={templateName:'入院记录模板v3.0', submitter:'张医生', urgency:'紧急'} → status='待审批', estimatedDays=1", () => {
    const input: TemplateApprovalInputV14 = {
      templateName: "入院记录模板v3.0",
      submitter: "张医生",
      urgency: "紧急",
    };
    const result = submitApproval(input);
    expect(result.status).toBe("待审批");
    expect(result.estimatedDays).toBe(1);
  });
});

describe("submitApproval 常规", () => {
  // 手算：input={templateName:'出院小结模板v4.0', submitter:'李医生', urgency:'常规'}
  // 手算：status='待审批'
  // 手算：urgency='常规' → estimatedDays=3
  it("input={templateName:'出院小结模板v4.0', submitter:'李医生', urgency:'常规'} → status='待审批', estimatedDays=3", () => {
    const input: TemplateApprovalInputV14 = {
      templateName: "出院小结模板v4.0",
      submitter: "李医生",
      urgency: "常规",
    };
    const result = submitApproval(input);
    expect(result.status).toBe("待审批");
    expect(result.estimatedDays).toBe(3);
  });
});

describe("buildTemplateApprovalReport 构建报告", () => {
  // 手算：{status:'待审批', estimatedDays=1}
  // 手算：estimatedDays=1 <= 1 → sla='24小时内审批'
  it("{status:'待审批', estimatedDays=1} → sla='24小时内审批'", () => {
    const report = buildTemplateApprovalReport({ status: "待审批", estimatedDays: 1 });
    expect(report.status).toBe("待审批");
    expect(report.sla).toBe("24小时内审批");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-approval auth:true", () => {
    const def = (emrTemplateApprovalV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-approval");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

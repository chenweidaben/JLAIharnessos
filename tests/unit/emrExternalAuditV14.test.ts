/**
 * 健澜科技 jlmedaios - 病历外审申请 V14 单测（M540-D）
 *
 * 测试 buildExternalAudit 构建外审申请、applyExternalAudit 外审申请、buildExternalAuditReport 构建外审报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExternalAudit,
  buildExternalAuditReport,
  applyExternalAudit,
  type ExternalAuditInputV14,
} from "../../src/bff/aggregators/emrExternalAuditV14Aggregator";
import { emrExternalAuditV14Routes } from "../../src/bff/routes/emrExternalAuditV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExternalAudit 构建外审申请", () => {
  // 手算：recordId='REC704', applicant='医务处' → 正确构建
  it("recordId='REC704', applicant='医务处' → 正确构建", () => {
    const base = buildExternalAudit("REC704", "医务处");
    expect(base.recordId).toBe("REC704");
    expect(base.applicant).toBe("医务处");
  });
});

describe("applyExternalAudit 正常", () => {
  // 手算：{recordId='REC704', auditOrg='卫健委', purpose='等级评审'}
  // 手算：applied = true
  // 手算：auditNo = 'EA' + Date.now().toString().slice(-6) → 以 'EA' 开头
  it("{recordId='REC704', auditOrg='卫健委'} → applied=true, auditNo 以 EA 开头", () => {
    const input: ExternalAuditInputV14 = { recordId: "REC704", auditOrg: "卫健委", purpose: "等级评审" };
    const result = applyExternalAudit(input);
    expect(result.applied).toBe(true);
    expect(result.auditNo.startsWith("EA")).toBe(true);
  });
});

describe("applyExternalAudit 另一申请", () => {
  // 手算：{recordId='REC705', auditOrg='医保局', purpose='飞行检查'}
  // 手算：applied = true
  // 手算：auditNo = 'EA' + Date.now().toString().slice(-6) → 以 'EA' 开头
  it("{recordId='REC705', auditOrg='医保局'} → applied=true, auditNo 以 EA 开头", () => {
    const input: ExternalAuditInputV14 = { recordId: "REC705", auditOrg: "医保局", purpose: "飞行检查" };
    const result = applyExternalAudit(input);
    expect(result.applied).toBe(true);
    expect(result.auditNo.startsWith("EA")).toBe(true);
  });
});

describe("buildExternalAuditReport 构建外审报告", () => {
  // 手算：{applied=true, auditNo='EA123456'}
  // 手算：透传 applied + auditNo
  it("{applied=true, auditNo='EA123456'} → 正确返回（透传）", () => {
    const report = buildExternalAuditReport({ applied: true, auditNo: "EA123456" });
    expect(report.applied).toBe(true);
    expect(report.auditNo).toBe("EA123456");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-external-audit auth:true", () => {
    const def = (emrExternalAuditV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-external-audit");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

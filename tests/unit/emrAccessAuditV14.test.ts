/**
 * 健澜科技 jlmedaios - 病历访问审计日志 V14 单测（M528-A）
 *
 * 测试 buildAccessAudit 构建审计、logAccessEvent 访问日志记录、buildAccessAuditReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAccessAudit,
  buildAccessAuditReport,
  logAccessEvent,
  type AccessAuditInputV14,
} from "../../src/bff/aggregators/emrAccessAuditV14Aggregator";
import { emrAccessAuditV14Routes } from "../../src/bff/routes/emrAccessAuditV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAccessAudit 构建审计", () => {
  // 手算：recordId='REC050', operator='张医生' → 正确构建
  it("recordId='REC050', operator='张医生' → 正确构建", () => {
    const audit = buildAccessAudit("REC050", "张医生");
    expect(audit.recordId).toBe("REC050");
    expect(audit.operator).toBe("张医生");
  });
});

describe("logAccessEvent 高风险敏感", () => {
  // 手算：{recordId:'REC050', operator:'张医生', action:'查看', isSensitive:true}
  // 手算：logged = true（任何访问都记录）
  // 手算：isSensitive=true → riskLevel='高风险'
  it("{recordId:'REC050', operator:'张医生', action:'查看', isSensitive:true} → logged=true, riskLevel='高风险'", () => {
    const input: AccessAuditInputV14 = {
      recordId: "REC050",
      operator: "张医生",
      action: "查看",
      isSensitive: true,
    };
    const result = logAccessEvent(input);
    expect(result.logged).toBe(true);
    expect(result.riskLevel).toBe("高风险");
  });
});

describe("logAccessEvent 中风险导出", () => {
  // 手算：{recordId:'REC051', operator:'李医生', action:'导出', isSensitive:false}
  // 手算：logged = true
  // 手算：isSensitive=false, action='导出' → riskLevel='中风险'
  it("{recordId:'REC051', operator:'李医生', action:'导出', isSensitive:false} → logged=true, riskLevel='中风险'", () => {
    const input: AccessAuditInputV14 = {
      recordId: "REC051",
      operator: "李医生",
      action: "导出",
      isSensitive: false,
    };
    const result = logAccessEvent(input);
    expect(result.logged).toBe(true);
    expect(result.riskLevel).toBe("中风险");
  });
});

describe("buildAccessAuditReport 构建报告", () => {
  // 手算：{logged:true, riskLevel:'高风险'}
  // 手算：透传 logged + riskLevel
  it("{logged:true, riskLevel:'高风险'} → 正确返回（透传）", () => {
    const report = buildAccessAuditReport({ logged: true, riskLevel: "高风险" });
    expect(report.logged).toBe(true);
    expect(report.riskLevel).toBe("高风险");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-access-audit auth:true", () => {
    const def = (emrAccessAuditV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-access-audit");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

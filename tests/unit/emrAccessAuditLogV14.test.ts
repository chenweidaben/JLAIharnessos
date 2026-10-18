/**
 * 健澜科技 jlmedaios - 病历调阅日志审计 V14 单测（M534-B）
 *
 * 测试 buildAccessAuditLog 构建调阅日志审计、logAccessEvent 日志审计、buildAccessAuditLogReport 构建报告、读路由 GET auth:true。
 * 命名空间与 M528-A emrAccessAuditV14 区分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAccessAuditLog,
  buildAccessAuditLogReport,
  logAccessEvent,
  type AccessAuditLogInputV14,
} from "../../src/bff/aggregators/emrAccessAuditLogV14Aggregator";
import { emrAccessAuditLogV14Routes } from "../../src/bff/routes/emrAccessAuditLogV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAccessAuditLog 构建调阅日志审计", () => {
  // 手算：recordId='REC101', operator='李医生' → 正确构建
  it("recordId='REC101', operator='李医生' → 正确构建", () => {
    const log = buildAccessAuditLog("REC101", "李医生");
    expect(log.recordId).toBe("REC101");
    expect(log.operator).toBe("李医生");
  });
});

describe("logAccessEvent 查看", () => {
  // 手算：{recordId:'REC101', operator='李医生', action='查看'}
  // 手算：logged = true
  // 手算：eventType = '调阅-' + '查看' = '调阅-查看'
  it("{recordId:'REC101', operator='李医生', action='查看'} → logged=true, eventType='调阅-查看'", () => {
    const input: AccessAuditLogInputV14 = { recordId: "REC101", operator: "李医生", action: "查看" };
    const result = logAccessEvent(input);
    expect(result.logged).toBe(true);
    expect(result.eventType).toBe("调阅-查看");
  });
});

describe("logAccessEvent 下载", () => {
  // 手算：{recordId:'REC102', operator='王医生', action='下载'}
  // 手算：logged = true
  // 手算：eventType = '调阅-' + '下载' = '调阅-下载'
  it("{recordId:'REC102', operator='王医生', action='下载'} → logged=true, eventType='调阅-下载'", () => {
    const input: AccessAuditLogInputV14 = { recordId: "REC102", operator: "王医生", action: "下载" };
    const result = logAccessEvent(input);
    expect(result.logged).toBe(true);
    expect(result.eventType).toBe("调阅-下载");
  });
});

describe("buildAccessAuditLogReport 构建报告", () => {
  // 手算：{logged:true, eventType='调阅-查看'}
  // 手算：透传 logged + eventType
  it("{logged:true, eventType='调阅-查看'} → 正确返回（透传）", () => {
    const report = buildAccessAuditLogReport({ logged: true, eventType: "调阅-查看" });
    expect(report.logged).toBe(true);
    expect(report.eventType).toBe("调阅-查看");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-access-audit-log auth:true", () => {
    const def = (emrAccessAuditLogV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-access-audit-log");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

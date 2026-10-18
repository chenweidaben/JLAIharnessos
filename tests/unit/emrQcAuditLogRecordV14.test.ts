/**
 * 健澜科技 jlmedaios - 质控操作日志审计记录 V14 单测（M498-B，避让 M467-C emrQcAuditLogV14）
 *
 * 测试 buildAuditLog 构建、filterAuditLog 过滤、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAuditLog,
  filterAuditLog,
  type AuditLogRecordV14,
} from "../../src/bff/aggregators/emrQcAuditLogRecordV14Aggregator";
import { emrQcAuditLogRecordV14Routes } from "../../src/bff/routes/emrQcAuditLogRecordV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAuditLog 提交病历", () => {
  // 手算：user='张医生', action='提交病历', time='2026-10-18 10:00' → 正确构建
  it("user='张医生', action='提交病历', time='2026-10-18 10:00' → 正确构建", () => {
    const log: AuditLogRecordV14 = buildAuditLog("张医生", "提交病历", "2026-10-18 10:00");
    expect(log.user).toBe("张医生");
    expect(log.action).toBe("提交病历");
    expect(log.time).toBe("2026-10-18 10:00");
  });
});

describe("filterAuditLog 按人名", () => {
  // 手算：3 条日志（张医生/提交病历, 李医生/审核病历, 张医生/修改病历），keyword='张医生' → 返回 2 条
  it("keyword='张医生' → 返回 2 条", () => {
    const logs = [
      buildAuditLog("张医生", "提交病历", "2026-10-18 10:00"),
      buildAuditLog("李医生", "审核病历", "2026-10-18 11:00"),
      buildAuditLog("张医生", "修改病历", "2026-10-18 14:00"),
    ];
    const result = filterAuditLog(logs, "张医生");
    expect(result.length).toBe(2);
  });
});

describe("filterAuditLog 按动作", () => {
  // 手算：keyword='审核' → 返回 1 条（李医生/审核病历）
  it("keyword='审核' → 返回 1 条", () => {
    const logs = [
      buildAuditLog("张医生", "提交病历", "2026-10-18 10:00"),
      buildAuditLog("李医生", "审核病历", "2026-10-18 11:00"),
      buildAuditLog("张医生", "修改病历", "2026-10-18 14:00"),
    ];
    const result = filterAuditLog(logs, "审核");
    expect(result.length).toBe(1);
    expect(result[0].user).toBe("李医生");
  });
});

describe("filterAuditLog 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    const logs: AuditLogRecordV14[] = [];
    const result = filterAuditLog(logs, "张医生");
    expect(result.length).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-audit-log-record auth:true", () => {
    const def = (emrQcAuditLogRecordV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-audit-log-record");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 质控操作日志查询明细 V14 单测（M507-B，-detail 避让）
 *
 * 测试 buildAuditLog 构建、searchAuditLog 搜索、buildAuditReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAuditLog,
  buildAuditReport,
  searchAuditLog,
  type AuditLogDetailV14,
} from "../../src/bff/aggregators/emrQcAuditLogDetailV14Aggregator";
import { emrQcAuditLogDetailV14Routes } from "../../src/bff/routes/emrQcAuditLogDetailV14";
import type { RouteDef } from "../../src/bff/types";

const sampleLogs: AuditLogDetailV14[] = [
  buildAuditLog("张医生", "删除规范", "2026-10-15 10:30"),
  buildAuditLog("李医生", "新增参数", "2026-10-15 11:00"),
  buildAuditLog("张医生", "修改制度", "2026-10-16 09:15"),
];

describe("buildAuditLog 张医生", () => {
  // 手算：user='张医生', action='删除规范', time='2026-10-15 10:30' → 正确构建
  it("user='张医生', action='删除规范', time='2026-10-15 10:30' → 正确构建", () => {
    const log: AuditLogDetailV14 = buildAuditLog("张医生", "删除规范", "2026-10-15 10:30");
    expect(log.user).toBe("张医生");
    expect(log.action).toBe("删除规范");
    expect(log.time).toBe("2026-10-15 10:30");
  });
});

describe("searchAuditLog 张医生", () => {
  // 手算：3 条日志，keyword='张医生' → user 包含'张医生'的有 2 条（张医生/删除规范、张医生/修改制度）
  it("keyword='张医生' → 返回 2 条", () => {
    const results = searchAuditLog(sampleLogs, "张医生");
    expect(results.length).toBe(2);
  });
});

describe("searchAuditLog 删除", () => {
  // 手算：3 条日志，keyword='删除' → action 包含'删除'的只有 1 条（张医生/删除规范）
  it("keyword='删除' → 返回 1 条", () => {
    const results = searchAuditLog(sampleLogs, "删除");
    expect(results.length).toBe(1);
    expect(results[0].action).toBe("删除规范");
  });
});

describe("buildAuditReport 两条结果", () => {
  // 手算：2 条结果 → resultCount=2（数组长度）
  it("2 条结果 → resultCount=2", () => {
    const results: AuditLogDetailV14[] = [
      buildAuditLog("张医生", "删除规范", "2026-10-15 10:30"),
      buildAuditLog("李医生", "新增参数", "2026-10-15 11:00"),
    ];
    const report = buildAuditReport(results);
    expect(report.resultCount).toBe(2);
    expect(report.results.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-audit-log-detail auth:true", () => {
    const def = (emrQcAuditLogDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-audit-log-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 病历质控追溯审计日志 V14 单测（M467-C）
 *
 * 测试 recordQcAudit 补 timestamp、filterAuditLogs 多条件过滤、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  filterAuditLogs,
  recordQcAudit,
  type AuditEntryV14,
} from "../../src/bff/aggregators/emrQcAuditLogV14Aggregator";
import { emrQcAuditLogV14Routes } from "../../src/bff/routes/emrQcAuditLogV14";
import type { RouteDef } from "../../src/bff/types";

const logs: AuditEntryV14[] = [
  { id: "L001", noteId: "N001", operator: "张三", ruleId: "R001", action: "flagged" },
  { id: "L002", noteId: "N001", operator: "李四", ruleId: "R002", action: "resolved" },
  { id: "L003", noteId: "N002", operator: "张三", ruleId: "R003", action: "flagged" },
];

describe("recordQcAudit 补 timestamp", () => {
  // 手算：传入无 timestamp 的 entry → 返回的 entry.timestamp 不为空
  it("传入 entry → 返回的 entry 含 timestamp", () => {
    const entry: AuditEntryV14 = { id: "L001", noteId: "N001", operator: "张三", ruleId: "R001", action: "flagged" };
    const result = recordQcAudit(entry);
    expect(result.timestamp).toBeDefined();
  });
});

describe("filterAuditLogs 按 noteId", () => {
  // 手算：3 条日志，filter noteId=N001 → 返回 L001+L002 共 2 条
  it("filter noteId=N001 → 返回 2 条", () => {
    const filtered = filterAuditLogs(logs, { noteId: "N001" });
    expect(filtered.length).toBe(2);
  });
});

describe("filterAuditLogs 按 operator", () => {
  // 手算：filter operator=张三 → 返回 L001+L003 共 2 条
  it("filter operator=张三 → 返回 2 条", () => {
    const filtered = filterAuditLogs(logs, { operator: "张三" });
    expect(filtered.length).toBe(2);
  });
});

describe("filterAuditLogs 空 filter", () => {
  // 手算：空 filter → 返回全部 3 条
  it("空 filter → 返回全部 3 条", () => {
    const filtered = filterAuditLogs(logs, {});
    expect(filtered.length).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-audit-log auth:true", () => {
    const def = (emrQcAuditLogV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-audit-log");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

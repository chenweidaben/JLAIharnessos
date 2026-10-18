/**
 * 健澜科技 jlmedaios - 病历复制痕迹保留 V14 单测（M463-B）
 *
 * 测试 recordCopy traceId 含 sourceNoteId、含 userId、auditCopyTraces total=3、按用户分组计数、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  auditCopyTraces,
  recordCopy,
  type CopyTraceV14,
} from "../../src/bff/aggregators/emrCopyTraceV14Aggregator";
import { emrCopyTraceV14Routes } from "../../src/bff/routes/emrCopyTraceV14";
import type { RouteDef } from "../../src/bff/types";

describe("recordCopy traceId 含 sourceNoteId", () => {
  // 手算：traceId = "SRC001->TGT001@u1"，含 "SRC001"
  it("traceId 含 sourceNoteId", () => {
    const trace = recordCopy("SRC001", "TGT001", "u1");
    expect(trace.traceId).toContain("SRC001");
  });
});

describe("recordCopy traceId 含 userId", () => {
  // 手算：traceId = "SRC001->TGT001@u1"，含 "u1"
  it("traceId 含 userId", () => {
    const trace = recordCopy("SRC001", "TGT001", "u1");
    expect(trace.traceId).toContain("u1");
  });
});

describe("auditCopyTraces total=3", () => {
  // 手算：3 条记录 → total = 3
  it("3 条记录 → total=3", () => {
    const traces: CopyTraceV14[] = [
      { traceId: "a->b@u1", sourceNoteId: "a", targetNoteId: "b", userId: "u1", copiedAt: "2026-10-18T00:00:00Z" },
      { traceId: "c->d@u2", sourceNoteId: "c", targetNoteId: "d", userId: "u2", copiedAt: "2026-10-18T00:01:00Z" },
      { traceId: "e->f@u1", sourceNoteId: "e", targetNoteId: "f", userId: "u1", copiedAt: "2026-10-18T00:02:00Z" },
    ];
    const audit = auditCopyTraces(traces);
    expect(audit.total).toBe(3);
  });
});

describe("auditCopyTraces 按用户分组计数", () => {
  // 手算：u1 出现 2 次，u2 出现 1 次 → byUser = [{u1,2}, {u2,1}]
  it("按用户分组计数正确", () => {
    const traces: CopyTraceV14[] = [
      { traceId: "a->b@u1", sourceNoteId: "a", targetNoteId: "b", userId: "u1", copiedAt: "2026-10-18T00:00:00Z" },
      { traceId: "c->d@u2", sourceNoteId: "c", targetNoteId: "d", userId: "u2", copiedAt: "2026-10-18T00:01:00Z" },
      { traceId: "e->f@u1", sourceNoteId: "e", targetNoteId: "f", userId: "u1", copiedAt: "2026-10-18T00:02:00Z" },
    ];
    const audit = auditCopyTraces(traces);
    const u1Count = audit.byUser.find((x) => x.userId === "u1")?.count ?? 0;
    const u2Count = audit.byUser.find((x) => x.userId === "u2")?.count ?? 0;
    expect(u1Count).toBe(2);
    expect(u2Count).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-copy-trace/:noteId auth:true", () => {
    const def = (emrCopyTraceV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-copy-trace/:noteId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

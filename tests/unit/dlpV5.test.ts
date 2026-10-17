/**
 * 健澜科技 jlmedaios - 操作审计与数据防泄漏 DLP V5 单测（M282-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  alertDLPV5,
  assessExportRiskV5,
  buildDlpV5Report,
  detectDLPV5,
  type DLPEvent,
  type ExportRequest,
} from "../../src/bff/aggregators/dlpV5Aggregator";
import { dlpV5Routes } from "../../src/bff/routes/dlpV5";

describe("detectDLPV5", () => {
  it("敏感字段+5000行→高风险阻断", () => {
    const e: DLPEvent = { userId: "u", action: "export", resource: "patient", rowCount: 5000, sensitiveFields: ["id_card"] };
    expect(detectDLPV5(e).risk).toBe("high");
    expect(detectDLPV5(e).blocked).toBe(true);
  });
  it("无敏感字段+50行→低风险", () => {
    const e: DLPEvent = { userId: "u", action: "query", resource: "lab", rowCount: 50, sensitiveFields: [] };
    expect(detectDLPV5(e).risk).toBe("low");
  });
});

describe("assessExportRiskV5", () => {
  it("外发邮箱+5000行→需审批", () => {
    const x: ExportRequest = { userId: "u", exportType: "query", rows: 5000, destination: "external_email" };
    expect(assessExportRiskV5(x).needsApproval).toBe(true);
  });
  it("内网少量导出→免审批", () => {
    const x: ExportRequest = { userId: "u", exportType: "query", rows: 50, destination: "internal_disk" };
    expect(assessExportRiskV5(x).needsApproval).toBe(false);
  });
});

describe("alertDLPV5", () => {
  it("高风险→CRITICAL并通知院领导", () => {
    const e: DLPEvent = { userId: "u", action: "export", resource: "patient", rowCount: 5000, sensitiveFields: ["id_card"] };
    const a = alertDLPV5(e);
    expect(a.level).toBe("CRITICAL");
    expect(a.notify).toContain("院领导");
  });
});

describe("buildDlpV5Report", () => {
  it("统计高风险与阻断", () => {
    const events: DLPEvent[] = [
      { userId: "u", action: "export", resource: "p", rowCount: 5000, sensitiveFields: ["id_card"] },
      { userId: "u", action: "query", resource: "l", rowCount: 50, sensitiveFields: [] },
    ];
    const r = buildDlpV5Report(events, []);
    expect(r.highRiskCount).toBe(1);
    expect(r.blockedCount).toBe(1);
  });
});

describe("dlpV5Routes 写权限", () => {
  it("POST /api/v1/dlp/export 路由存在且 auth:true", () => {
    const post = dlpV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/dlp/export");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});

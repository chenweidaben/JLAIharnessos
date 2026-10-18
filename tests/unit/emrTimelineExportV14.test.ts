/**
 * 健澜科技 jlmedaios - 病历时间线导出 V14 单测（M538-D）
 *
 * 测试 buildTimelineExport 构建导出、exportTimeline 时间线导出、buildTimelineExportReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTimelineExport,
  buildTimelineExportReport,
  exportTimeline,
  type TimelineExportInputV14,
} from "../../src/bff/aggregators/emrTimelineExportV14Aggregator";
import { emrTimelineExportV14Routes } from "../../src/bff/routes/emrTimelineExportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTimelineExport 构建导出", () => {
  // 手算：recordId='REC503', format='PDF' → 正确构建
  it("recordId='REC503', format='PDF' → 正确构建", () => {
    const exportBase = buildTimelineExport("REC503", "PDF");
    expect(exportBase.recordId).toBe("REC503");
    expect(exportBase.format).toBe("PDF");
  });
});

describe("exportTimeline PDF", () => {
  // 手算：{recordId='REC503', eventCount=12, format='PDF'}
  // 手算：exported = true
  // 手算：fileSizeKB = Math.ceil(eventCount * 2) = Math.ceil(12*2) = Math.ceil(24) = 24
  it("{recordId='REC503', eventCount=12, format='PDF'} → exported=true, fileSizeKB=24", () => {
    const input: TimelineExportInputV14 = { recordId: "REC503", eventCount: 12, format: "PDF" };
    const result = exportTimeline(input);
    expect(result.exported).toBe(true);
    expect(result.fileSizeKB).toBe(24);
  });
});

describe("exportTimeline Excel", () => {
  // 手算：{recordId='REC504', eventCount=7, format='Excel'}
  // 手算：exported = true
  // 手算：fileSizeKB = Math.ceil(eventCount * 2) = Math.ceil(7*2) = Math.ceil(14) = 14
  it("{recordId='REC504', eventCount=7, format='Excel'} → exported=true, fileSizeKB=14", () => {
    const input: TimelineExportInputV14 = { recordId: "REC504", eventCount: 7, format: "Excel" };
    const result = exportTimeline(input);
    expect(result.exported).toBe(true);
    expect(result.fileSizeKB).toBe(14);
  });
});

describe("buildTimelineExportReport 构建报告", () => {
  // 手算：{exported=true, fileSizeKB=24}
  // 手算：透传 exported + fileSizeKB
  it("{exported=true, fileSizeKB=24} → 正确返回（透传）", () => {
    const report = buildTimelineExportReport({ exported: true, fileSizeKB: 24 });
    expect(report.exported).toBe(true);
    expect(report.fileSizeKB).toBe(24);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-timeline-export auth:true", () => {
    const def = (emrTimelineExportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-timeline-export");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 病历质控报表中心 V14 单测（M478-D，M478 收官）
 *
 * 测试 buildReportCenter 目录构建、generateQcReport 报表生成、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReportCenter,
  generateQcReport,
  type GeneratedReportV14,
  type ReportItemV14,
} from "../../src/bff/aggregators/emrQcReportCenterV14Aggregator";
import { emrQcReportCenterV14Routes } from "../../src/bff/routes/emrQcReportCenterV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildReportCenter 3 个报表", () => {
  // 手算：3 个报表 → 返回目录含 3 条
  it("3 个报表 → 返回目录含 3 条", () => {
    const reports: ReportItemV14[] = [
      { id: "R001", name: "日报", category: "日报" },
      { id: "R002", name: "周报", category: "周报" },
      { id: "R003", name: "月报", category: "月报" },
    ];
    const center = buildReportCenter(reports);
    expect(center.reports.length).toBe(3);
    expect(center.total).toBe(3);
  });
});

describe("buildReportCenter 空数组", () => {
  // 手算：空数组 → 返回空目录
  it("空数组 → 返回空目录", () => {
    const center = buildReportCenter([]);
    expect(center.reports).toEqual([]);
    expect(center.total).toBe(0);
  });
});

describe("generateQcReport 正确生成", () => {
  // 手算：reportId='R001', params={dept:'内科', period:'2026-10'} → 正确生成
  it("reportId=R001, params={dept:内科, period:2026-10} → 正确生成", () => {
    const report: GeneratedReportV14 = generateQcReport("R001", { dept: "内科", period: "2026-10" });
    expect(report.reportId).toBe("R001");
    expect(report.dept).toBe("内科");
    expect(report.period).toBe("2026-10");
  });
});

describe("generateQcReport 含字段", () => {
  // 手算：生成结果含 reportId 和 generatedAt
  it("生成结果含 reportId 和 generatedAt", () => {
    const report: GeneratedReportV14 = generateQcReport("R001", { dept: "内科", period: "2026-10" });
    expect(report).toHaveProperty("reportId");
    expect(report).toHaveProperty("generatedAt");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-report-center auth:true", () => {
    const def = (emrQcReportCenterV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-report-center");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

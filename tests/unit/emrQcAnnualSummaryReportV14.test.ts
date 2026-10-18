/**
 * 健澜科技 jlmedaios - 质控年度总结报告 V14 单测（M506-D，M506 收官）
 *
 * 测试 buildAnnualReport 构建、aggregateAnnualReport 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateAnnualReport,
  buildAnnualReport,
  type AnnualReportV14,
} from "../../src/bff/aggregators/emrQcAnnualSummaryReportV14Aggregator";
import { emrQcAnnualSummaryReportV14Routes } from "../../src/bff/routes/emrQcAnnualSummaryReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAnnualReport 2025", () => {
  // 手算：year=2025, totalRecords=12000, passRate=95 → 正确构建
  it("year=2025, totalRecords=12000, passRate=95 → 正确构建", () => {
    const report: AnnualReportV14 = buildAnnualReport(2025, 12000, 95);
    expect(report.year).toBe(2025);
    expect(report.totalRecords).toBe(12000);
    expect(report.passRate).toBe(95);
  });
});

describe("aggregateAnnualReport 两年", () => {
  // 手算：2 年（2025/12000/95, 2024/11000/92）
  // years = 2
  // totalRecords = 12000+11000 = 23000
  // avgPassRate = Math.round((95+92)/2) = Math.round(93.5) = 94
  it("2 年（2025/12000/95, 2024/11000/92）→ years=2, totalRecords=23000, avgPassRate=94", () => {
    const reports: AnnualReportV14[] = [
      buildAnnualReport(2025, 12000, 95),
      buildAnnualReport(2024, 11000, 92),
    ];
    const result = aggregateAnnualReport(reports);
    expect(result.years).toBe(2);
    expect(result.totalRecords).toBe(23000);
    expect(result.avgPassRate).toBe(94);
  });
});

describe("aggregateAnnualReport 空数组", () => {
  // 手算：空数组 → years=0, totalRecords=0, avgPassRate=0
  it("空数组 → years=0, totalRecords=0, avgPassRate=0", () => {
    const reports: AnnualReportV14[] = [];
    const result = aggregateAnnualReport(reports);
    expect(result.years).toBe(0);
    expect(result.totalRecords).toBe(0);
    expect(result.avgPassRate).toBe(0);
  });
});

describe("buildAnnualReport 2024", () => {
  // 手算：year=2024, totalRecords=11000, passRate=92 → 正确构建
  it("year=2024, totalRecords=11000, passRate=92 → 正确构建", () => {
    const report: AnnualReportV14 = buildAnnualReport(2024, 11000, 92);
    expect(report.year).toBe(2024);
    expect(report.totalRecords).toBe(11000);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-annual-summary-report auth:true", () => {
    const def = (emrQcAnnualSummaryReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-annual-summary-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

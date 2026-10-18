/**
 * 健澜科技 jlmedaios - 质控月度报表 V14 单测（M506-C）
 *
 * 测试 buildMonthlyReport 构建、aggregateMonthlyReport 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateMonthlyReport,
  buildMonthlyReport,
  type MonthlyReportV14,
} from "../../src/bff/aggregators/emrQcMonthlyReportV14Aggregator";
import { emrQcMonthlyReportV14Routes } from "../../src/bff/routes/emrQcMonthlyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMonthlyReport 2026-01", () => {
  // 手算：month='2026-01', totalRecords=1000, defects=50 → 正确构建
  it("month='2026-01', totalRecords=1000, defects=50 → 正确构建", () => {
    const report: MonthlyReportV14 = buildMonthlyReport("2026-01", 1000, 50);
    expect(report.month).toBe("2026-01");
    expect(report.totalRecords).toBe(1000);
    expect(report.defects).toBe(50);
  });
});

describe("aggregateMonthlyReport 三个月", () => {
  // 手算：3 个月（1000/50, 1200/60, 900/45）
  // months = 3
  // totalRecords = 1000+1200+900 = 3100
  // totalDefects = 50+60+45 = 155
  // defectRate = Math.ceil(155/3100*100) = Math.ceil(5.0) = 5
  it("3 个月（1000/50, 1200/60, 900/45）→ months=3, totalRecords=3100, totalDefects=155, defectRate=5", () => {
    const reports: MonthlyReportV14[] = [
      buildMonthlyReport("2026-01", 1000, 50),
      buildMonthlyReport("2026-02", 1200, 60),
      buildMonthlyReport("2026-03", 900, 45),
    ];
    const result = aggregateMonthlyReport(reports);
    expect(result.months).toBe(3);
    expect(result.totalRecords).toBe(3100);
    expect(result.totalDefects).toBe(155);
    expect(result.defectRate).toBe(5);
  });
});

describe("aggregateMonthlyReport 空数组", () => {
  // 手算：空数组 → months=0, totalRecords=0, totalDefects=0, defectRate=0
  it("空数组 → months=0, totalRecords=0, totalDefects=0, defectRate=0", () => {
    const reports: MonthlyReportV14[] = [];
    const result = aggregateMonthlyReport(reports);
    expect(result.months).toBe(0);
    expect(result.totalRecords).toBe(0);
    expect(result.totalDefects).toBe(0);
    expect(result.defectRate).toBe(0);
  });
});

describe("buildMonthlyReport 2026-02", () => {
  // 手算：month='2026-02', totalRecords=1200, defects=60 → 正确构建
  it("month='2026-02', totalRecords=1200, defects=60 → 正确构建", () => {
    const report: MonthlyReportV14 = buildMonthlyReport("2026-02", 1200, 60);
    expect(report.month).toBe("2026-02");
    expect(report.totalRecords).toBe(1200);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-monthly-report auth:true", () => {
    const def = (emrQcMonthlyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-monthly-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

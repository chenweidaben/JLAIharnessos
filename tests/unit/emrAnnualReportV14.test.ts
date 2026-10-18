/**
 * 健澜科技 jlmedaios - 病历质控年度总结报告 V14 单测（M471-D，M471 收官）
 *
 * 测试 buildAnnualReport 年度报告、summarizeYearlyTrends 趋势汇总、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAnnualReport,
  summarizeYearlyTrends,
} from "../../src/bff/aggregators/emrAnnualReportV14Aggregator";
import { emrAnnualReportV14Routes } from "../../src/bff/routes/emrAnnualReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAnnualReport 年度报告", () => {
  // 手算：year=2026, totalRecords=12000, avgScore=92, defectCount=600 → 报告含 year=2026
  it("year=2026, totalRecords=12000, avgScore=92, defectCount=600 → 报告含 year=2026", () => {
    const report = buildAnnualReport(2026, {
      totalRecords: 12000,
      avgScore: 92,
      defectCount: 600,
    });
    expect(report.year).toBe(2026);
    expect(report.totalRecords).toBe(12000);
  });
});

describe("summarizeYearlyTrends 全 90", () => {
  // 手算：12 个月分数全是 90 → avg = (90×12)/12 = 90；bestMonth=1（第一个最高分）
  it("12 个月分数全是 90 → avg=90，bestMonth=1", () => {
    const monthly = Array(12).fill(90);
    const trend = summarizeYearlyTrends(monthly);
    expect(trend.avg).toBe(90);
    expect(trend.bestMonth).toBe(1);
  });
});

describe("summarizeYearlyTrends 递增", () => {
  // 手算：[80,85,90,...,99]（递增，12 个月）→ bestMonth=12（最高分），worstMonth=1（最低分）
  it("[80,85,90,...,99]（递增）→ bestMonth=12，worstMonth=1", () => {
    const monthly = [80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91];
    const trend = summarizeYearlyTrends(monthly);
    expect(trend.bestMonth).toBe(12);
    expect(trend.worstMonth).toBe(1);
  });
});

describe("summarizeYearlyTrends 空数组", () => {
  // 手算：空数组 → avg=0
  it("空数组 → avg=0", () => {
    const trend = summarizeYearlyTrends([]);
    expect(trend.avg).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-annual-report/:year auth:true", () => {
    const def = (emrAnnualReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-annual-report/:year");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

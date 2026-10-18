/**
 * 健澜科技 jlmedaios - 科室质控月报自动生成 V14 单测（M518-A，避让 -dept）
 *
 * 测试 buildDeptMonthlyReport 构建月报、generateDeptMonthlyReport 生成统计、buildDeptMonthlyReportSummary 构建摘要、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptMonthlyReport,
  buildDeptMonthlyReportSummary,
  generateDeptMonthlyReport,
  type DeptMonthlyDefectsV14,
} from "../../src/bff/aggregators/emrQcDeptMonthlyReportV14Aggregator";
import { emrQcDeptMonthlyReportV14Routes } from "../../src/bff/routes/emrQcDeptMonthlyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptMonthlyReport 构建月报", () => {
  // 手算：dept='心内科', month='2026-10', totalRecords=300 → 正确构建
  it("dept='心内科', month='2026-10', totalRecords=300 → 正确构建", () => {
    const report = buildDeptMonthlyReport("心内科", "2026-10", 300);
    expect(report.dept).toBe("心内科");
    expect(report.month).toBe("2026-10");
    expect(report.totalRecords).toBe(300);
  });
});

describe("generateDeptMonthlyReport 生成统计", () => {
  // 手算：defects={block:1, major:3, minor:5} → totalDefects=1+3+5=9
  // 手算：score=100-1×15-3×8-5×3=100-15-24-15=46
  it("defects={block:1, major:3, minor:5} → totalDefects=9, score=46", () => {
    const report = buildDeptMonthlyReport("心内科", "2026-10", 300);
    const defects: DeptMonthlyDefectsV14 = { block: 1, major: 3, minor: 5 };
    const result = generateDeptMonthlyReport(report, defects);
    expect(result.totalDefects).toBe(9);
    expect(result.score).toBe(46);
  });
});

describe("buildDeptMonthlyReportSummary 构建摘要", () => {
  // 手算：score=46 < 70 → grade='不合格'
  it("{totalDefects:9, score:46} → grade='不合格'", () => {
    const summary = buildDeptMonthlyReportSummary({ totalDefects: 9, score: 46 });
    expect(summary.score).toBe(46);
    expect(summary.grade).toBe("不合格");
  });
});

describe("generateDeptMonthlyReport 满分场景", () => {
  // 手算：defects={block:0, major:0, minor:0} → totalDefects=0, score=100（无扣分）
  it("defects={block:0, major:0, minor:0} → totalDefects=0, score=100", () => {
    const report = buildDeptMonthlyReport("心内科", "2026-10", 300);
    const defects: DeptMonthlyDefectsV14 = { block: 0, major: 0, minor: 0 };
    const result = generateDeptMonthlyReport(report, defects);
    expect(result.totalDefects).toBe(0);
    expect(result.score).toBe(100);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-monthly-report auth:true", () => {
    const def = (emrQcDeptMonthlyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-monthly-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

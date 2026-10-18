/**
 * 健澜科技 jlmedaios - 模板使用统计分析 V14 单测（M525-C）
 *
 * 测试 buildUsageStats 构建统计、analyzeTemplateUsage 使用分析、buildUsageStatsReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildUsageStats,
  buildUsageStatsReport,
  analyzeTemplateUsage,
  type UsageStatsInputV14,
} from "../../src/bff/aggregators/emrTemplateUsageStatsV14Aggregator";
import { emrTemplateUsageStatsV14Routes } from "../../src/bff/routes/emrTemplateUsageStatsV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildUsageStats 构建统计", () => {
  // 手算：dept='心内科', period='2026-Q3' → 正确构建
  it("dept='心内科', period='2026-Q3' → 正确构建", () => {
    const stats = buildUsageStats("心内科", "2026-Q3");
    expect(stats.dept).toBe("心内科");
    expect(stats.period).toBe("2026-Q3");
  });
});

describe("analyzeTemplateUsage 高频", () => {
  // 手算：{templateName:'入院记录模板', usedCount:420, totalRecords:500}
  // 手算：usageRate = 420/500=0.84 → 0.84*1000=840 → Math.round(840)/10 = 84.0
  // 手算：84.0 >= 80 → popularity='高频使用'
  it("{templateName:'入院记录模板', usedCount:420, totalRecords:500} → usageRate=84.0, popularity='高频使用'", () => {
    const input: UsageStatsInputV14 = { templateName: "入院记录模板", usedCount: 420, totalRecords: 500 };
    const result = analyzeTemplateUsage(input);
    expect(result.usageRate).toBeCloseTo(84.0, 1);
    expect(result.popularity).toBe("高频使用");
  });
});

describe("analyzeTemplateUsage 中频", () => {
  // 手算：{templateName:'手术记录模板', usedCount:150, totalRecords:300}
  // 手算：usageRate = 150/300=0.5 → 0.5*1000=500 → Math.round(500)/10 = 50.0
  // 手算：50.0 >= 50 → popularity='中频使用'
  it("{templateName:'手术记录模板', usedCount:150, totalRecords:300} → usageRate=50.0, popularity='中频使用'", () => {
    const input: UsageStatsInputV14 = { templateName: "手术记录模板", usedCount: 150, totalRecords: 300 };
    const result = analyzeTemplateUsage(input);
    expect(result.usageRate).toBeCloseTo(50.0, 1);
    expect(result.popularity).toBe("中频使用");
  });
});

describe("buildUsageStatsReport 构建报告", () => {
  // 手算：{usageRate:84.0, popularity:'高频使用'}
  // 手算：透传 usageRate + popularity
  it("{usageRate:84.0, popularity:'高频使用'} → 正确返回（透传）", () => {
    const report = buildUsageStatsReport({ usageRate: 84.0, popularity: "高频使用" });
    expect(report.usageRate).toBeCloseTo(84.0, 1);
    expect(report.popularity).toBe("高频使用");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-usage-stats auth:true", () => {
    const def = (emrTemplateUsageStatsV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-usage-stats");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

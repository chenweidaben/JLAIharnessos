/**
 * 健澜科技 jlmedaios - 质控问题趋势分析（避让版）V14 单测（M542-D，M542 收官）
 *
 * 测试 buildQcTrendAnalysis 构建质控趋势、analyzeQcTrendAnalysis 趋势分析、buildQcTrendAnalysisReport 构建趋势报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQcTrendAnalysis,
  buildQcTrendAnalysisReport,
  analyzeQcTrendAnalysis,
  type QcTrendAnalysisInputV14,
} from "../../src/bff/aggregators/emrQcTrendAnalysisV14Aggregator";
import { emrQcTrendAnalysisV14Routes } from "../../src/bff/routes/emrQcTrendAnalysisV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQcTrendAnalysis 构建质控趋势", () => {
  // 手算：dept='心内科', year=2026 → 正确构建
  it("dept='心内科', year=2026 → 正确构建", () => {
    const base = buildQcTrendAnalysis("心内科", 2026);
    expect(base.dept).toBe("心内科");
    expect(base.year).toBe(2026);
  });
});

describe("analyzeQcTrendAnalysis 下降", () => {
  // 手算：{monthlyDefects=[30,25,15]}
  // 手算：avgDefects = Math.round((30+25+15)/3*10)/10 = Math.round(70/3*10)/10 = Math.round(233.333...)/10 = 233/10 = 23.3
  // 手算：trend = 末月=15, 首月=30 → 15<30 → '下降'
  it("{monthlyDefects=[30,25,15]} → avgDefects=23.3, trend='下降'", () => {
    const input: QcTrendAnalysisInputV14 = { monthlyDefects: [30, 25, 15] };
    const result = analyzeQcTrendAnalysis(input);
    expect(result.avgDefects).toBeCloseTo(23.3);
    expect(result.trend).toBe("下降");
  });
});

describe("analyzeQcTrendAnalysis 上升", () => {
  // 手算：{monthlyDefects=[10,20,30]}
  // 手算：avgDefects = Math.round((10+20+30)/3*10)/10 = Math.round(60/3*10)/10 = Math.round(200)/10 = 200/10 = 20.0
  // 手算：trend = 末月=30, 首月=10 → 30>10 → '上升'
  it("{monthlyDefects=[10,20,30]} → avgDefects=20.0, trend='上升'", () => {
    const input: QcTrendAnalysisInputV14 = { monthlyDefects: [10, 20, 30] };
    const result = analyzeQcTrendAnalysis(input);
    expect(result.avgDefects).toBeCloseTo(20.0);
    expect(result.trend).toBe("上升");
  });
});

describe("buildQcTrendAnalysisReport 构建趋势报告", () => {
  // 手算：{avgDefects=23.3, trend='下降'}
  // 手算：透传 avgDefects + trend
  it("{avgDefects=23.3, trend='下降'} → 正确返回（透传）", () => {
    const report = buildQcTrendAnalysisReport({ avgDefects: 23.3, trend: "下降" });
    expect(report.avgDefects).toBeCloseTo(23.3);
    expect(report.trend).toBe("下降");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-trend-analysis auth:true", () => {
    const def = (emrQcTrendAnalysisV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-trend-analysis");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

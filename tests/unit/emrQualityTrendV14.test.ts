/**
 * 健澜科技 jlmedaios - 病历质量趋势分析 V14 单测（M536-B）
 *
 * 测试 buildQualityTrend 构建趋势分析、analyzeQualityTrend 趋势分析、buildQualityTrendReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQualityTrend,
  buildQualityTrendReport,
  analyzeQualityTrend,
  type QualityTrendInputV14,
} from "../../src/bff/aggregators/emrQualityTrendV14Aggregator";
import { emrQualityTrendV14Routes } from "../../src/bff/routes/emrQualityTrendV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQualityTrend 构建趋势分析", () => {
  // 手算：dept='心内科', year=2026 → 正确构建
  it("dept='心内科', year=2026 → 正确构建", () => {
    const trend = buildQualityTrend("心内科", 2026);
    expect(trend.dept).toBe("心内科");
    expect(trend.year).toBe(2026);
  });
});

describe("analyzeQualityTrend 上升", () => {
  // 手算：{scores=[85,88,92]}
  // 手算：avgScore = Math.round((85+88+92)/3*10)/10 = Math.round(265/3*10)/10 = Math.round(88.333*10)/10 = Math.round(883.33)/10 = 883/10 = 88.3
  // 手算：trend = scores[last]=92 > scores[first]=85 → '上升'
  it("{scores=[85,88,92]} → avgScore=88.3, trend='上升'", () => {
    const input: QualityTrendInputV14 = { scores: [85, 88, 92] };
    const result = analyzeQualityTrend(input);
    expect(result.avgScore).toBeCloseTo(88.3, 1);
    expect(result.trend).toBe("上升");
  });
});

describe("analyzeQualityTrend 下降", () => {
  // 手算：{scores=[92,88,85]}
  // 手算：avgScore = Math.round((92+88+85)/3*10)/10 = Math.round(265/3*10)/10 = 88.3
  // 手算：trend = scores[last]=85 < scores[first]=92 → '下降'
  it("{scores=[92,88,85]} → avgScore=88.3, trend='下降'", () => {
    const input: QualityTrendInputV14 = { scores: [92, 88, 85] };
    const result = analyzeQualityTrend(input);
    expect(result.avgScore).toBeCloseTo(88.3, 1);
    expect(result.trend).toBe("下降");
  });
});

describe("buildQualityTrendReport 构建报告", () => {
  // 手算：{avgScore=88.3, trend='上升'}
  // 手算：透传 avgScore + trend
  it("{avgScore=88.3, trend='上升'} → 正确返回（透传）", () => {
    const report = buildQualityTrendReport({ avgScore: 88.3, trend: "上升" });
    expect(report.avgScore).toBe(88.3);
    expect(report.trend).toBe("上升");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-quality-trend auth:true", () => {
    const def = (emrQualityTrendV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-quality-trend");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

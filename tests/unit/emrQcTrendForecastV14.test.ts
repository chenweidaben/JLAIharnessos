/**
 * 健澜科技 jlmedaios - 质控缺陷趋势预测 V14 单测（M495-A）
 *
 * 测试 forecastDefectTrend 预测、buildTrendForecastReport 构建、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  forecastDefectTrend,
  buildTrendForecastReport,
  type TrendForecastResultV14,
} from "../../src/bff/aggregators/emrQcTrendForecastV14Aggregator";
import { emrQcTrendForecastV14Routes } from "../../src/bff/routes/emrQcTrendForecastV14";
import type { RouteDef } from "../../src/bff/types";

describe("forecastDefectTrend 下降", () => {
  // 手算：近 3 月缺陷数 10/8/6（递减）→ trendDirection='下降'
  it("近 3 月缺陷数 10/8/6（递减）→ trendDirection='下降'", () => {
    const history = [
      { month: "2026-01", defects: 10 },
      { month: "2026-02", defects: 8 },
      { month: "2026-03", defects: 6 },
    ];
    const result = forecastDefectTrend(history);
    expect(result.trendDirection).toBe("下降");
  });
});

describe("forecastDefectTrend 上升", () => {
  // 手算：近 3 月缺陷数 5/8/10（递增）→ trendDirection='上升'
  it("近 3 月缺陷数 5/8/10（递增）→ trendDirection='上升'", () => {
    const history = [
      { month: "2026-01", defects: 5 },
      { month: "2026-02", defects: 8 },
      { month: "2026-03", defects: 10 },
    ];
    const result = forecastDefectTrend(history);
    expect(result.trendDirection).toBe("上升");
  });
});

describe("buildTrendForecastReport 下降", () => {
  // 手算：trendDirection='下降' → predictedNext < 最近值
  it("trendDirection='下降' → predictedNext < 最近值", () => {
    const history = [
      { month: "2026-01", defects: 10 },
      { month: "2026-02", defects: 8 },
      { month: "2026-03", defects: 6 },
    ];
    const result: TrendForecastResultV14 = forecastDefectTrend(history);
    const report = buildTrendForecastReport(result);
    expect(report.trendDirection).toBe("下降");
    expect(report.predictedNext).toBeLessThan(6);
  });
});

describe("buildTrendForecastReport 持平", () => {
  // 手算：trendDirection='持平' → predictedNext ≈ 最近值
  it("trendDirection='持平' → predictedNext ≈ 最近值", () => {
    const history = [
      { month: "2026-01", defects: 8 },
      { month: "2026-02", defects: 8 },
      { month: "2026-03", defects: 8 },
    ];
    const result: TrendForecastResultV14 = forecastDefectTrend(history);
    const report = buildTrendForecastReport(result);
    expect(report.trendDirection).toBe("持平");
    expect(report.predictedNext).toBe(8);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-trend-forecast auth:true", () => {
    const def = (emrQcTrendForecastV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-trend-forecast");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

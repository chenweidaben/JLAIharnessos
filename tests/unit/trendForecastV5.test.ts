/**
 * 健澜科技 jlmedaios - 趋势预测与经营预警 V5 单测（M287-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTrendReportV5,
  detectAnomalyV5,
  forecastTrendV5,
  type TrendPoint,
} from "../../src/bff/aggregators/trendForecastV5Aggregator";
import { trendForecastV5Routes } from "../../src/bff/routes/trendForecastV5";

describe("forecastTrendV5", () => {
  it("历史[8800,9000,9200]→斜率200，下一期9400", () => {
    const history: TrendPoint[] = [
      { date: "d1", actual: 8800 },
      { date: "d2", actual: 9000 },
      { date: "d3", actual: 9200 },
    ];
    const f = forecastTrendV5(history);
    expect(f.slope).toBe(200);
    expect(f.nextForecast).toBe(9400);
  });
  it("不足两点→斜率0", () => {
    const f = forecastTrendV5([{ date: "d1", actual: 100 }]);
    expect(f.slope).toBe(0);
  });
});

describe("detectAnomalyV5", () => {
  it("actual=5200, upper=5000→异常", () => {
    expect(detectAnomalyV5(5200, 5700, 5000).isAnomaly).toBe(true);
  });
  it("actual=4800, upper=5000→正常", () => {
    expect(detectAnomalyV5(4800, 4900, 5000).isAnomaly).toBe(false);
  });
});

describe("buildTrendReportV5", () => {
  it("医疗收入3点，第3点5200>5000上限→异常数=1", () => {
    const history: TrendPoint[] = [
      { date: "d1", actual: 4600 },
      { date: "d2", actual: 4700 },
      { date: "d3", actual: 5200 },
    ];
    const r = buildTrendReportV5("医疗收入", history, [5000, 5000, 5000]);
    expect(r.anomalyCount).toBe(1);
    // slope = 5200-4700 = 500
    expect(r.slope).toBe(500);
    expect(r.nextForecast).toBe(5700);
  });
});

describe("trendForecastV5Routes 写权限", () => {
  it("POST /api/v1/trend-forecast/alert 路由存在且 auth:true", () => {
    const post = trendForecastV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/trend-forecast/alert");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});

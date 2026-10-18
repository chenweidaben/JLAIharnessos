/**
 * 健澜科技 jlmedaios - 病历AI质控趋势预测 V14 单测（M549-D，M549 收官）
 *
 * 测试 buildAiQcTrendForecast 构建 AI 趋势预测、forecastQcTrendByAi AI 趋势预测、buildAiQcTrendForecastReport 构建趋势预测报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQcTrendForecast,
  buildAiQcTrendForecastReport,
  forecastQcTrendByAi,
  type AiQcTrendForecastInputV14,
} from "../../src/bff/aggregators/emrAiQcTrendForecastV14Aggregator";
import { emrAiQcTrendForecastV14Routes } from "../../src/bff/routes/emrAiQcTrendForecastV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQcTrendForecast 构建 AI 趋势预测", () => {
  // 手算：recordId='RECB020', dept='医务处' → 正确构建
  it("recordId='RECB020', dept='医务处' → 正确构建", () => {
    const base = buildAiQcTrendForecast("RECB020", "医务处");
    expect(base.recordId).toBe("RECB020");
    expect(base.dept).toBe("医务处");
  });
});

describe("forecastQcTrendByAi 上升", () => {
  // 手算：{currentPassRate=85.0, monthlyImprove=3.5}
  // 手算：nextMonthRate = Math.min(100, Math.round((85.0+3.5)*10)/10) = Math.min(100, Math.round(885)/10) = 885/10 = 88.5
  // 手算：nextMonthRate=88.5 > currentPassRate=85.0 → direction='上升'
  it("{currentPassRate=85.0, monthlyImprove=3.5} → nextMonthRate=88.5, direction='上升'", () => {
    const input: AiQcTrendForecastInputV14 = { currentPassRate: 85.0, monthlyImprove: 3.5 };
    const result = forecastQcTrendByAi(input);
    expect(result.nextMonthRate).toBe(88.5);
    expect(result.direction).toBe("上升");
  });
});

describe("forecastQcTrendByAi 下降", () => {
  // 手算：{currentPassRate=90.0, monthlyImprove=-2.0}
  // 手算：nextMonthRate = Math.min(100, Math.round((90.0-2.0)*10)/10) = Math.min(100, Math.round(880)/10) = 880/10 = 88.0
  // 手算：nextMonthRate=88.0 < currentPassRate=90.0 → direction='下降'
  it("{currentPassRate=90.0, monthlyImprove=-2.0} → nextMonthRate=88.0, direction='下降'", () => {
    const input: AiQcTrendForecastInputV14 = { currentPassRate: 90.0, monthlyImprove: -2.0 };
    const result = forecastQcTrendByAi(input);
    expect(result.nextMonthRate).toBe(88.0);
    expect(result.direction).toBe("下降");
  });
});

describe("buildAiQcTrendForecastReport 构建趋势预测报告", () => {
  // 手算：{nextMonthRate=88.5, direction='上升'}
  // 手算：透传 nextMonthRate + direction
  it("{nextMonthRate=88.5, direction='上升'} → 正确返回（透传）", () => {
    const report = buildAiQcTrendForecastReport({ nextMonthRate: 88.5, direction: "上升" });
    expect(report.nextMonthRate).toBe(88.5);
    expect(report.direction).toBe("上升");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-qc-trend-forecast auth:true", () => {
    const def = (emrAiQcTrendForecastV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-qc-trend-forecast");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 病历质控指标趋势预测 V14 单测（M470-A）
 *
 * 测试 linearForecast 线性外推、buildForecastChart 组装、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildForecastChart,
  linearForecast,
} from "../../src/bff/aggregators/emrTrendForecastV14Aggregator";
import { emrTrendForecastV14Routes } from "../../src/bff/routes/emrTrendForecastV14";
import type { RouteDef } from "../../src/bff/types";

describe("linearForecast 上升趋势", () => {
  // 手算：history=[90,92,94]（每月+2），last=94，斜率=(94-90)/2=2
  // forecast[0]=94+2*1=96, forecast[1]=94+2*2=98, forecast[2]=94+2*3=100
  it("history=[90,92,94], futureMonths=3 → 预测 96,98,100", () => {
    const result = linearForecast([90, 92, 94], 3);
    expect(result).toEqual([96, 98, 100]);
  });
});

describe("linearForecast 下降趋势", () => {
  // 手算：history=[100,98,96]（每月-2），last=96，斜率=(96-100)/2=-2
  // forecast[0]=96+(-2)*1=94, forecast[1]=96+(-2)*2=92
  it("history=[100,98,96], futureMonths=2 → 预测 94,92", () => {
    const result = linearForecast([100, 98, 96], 2);
    expect(result).toEqual([94, 92]);
  });
});

describe("linearForecast futureMonths=0", () => {
  // 手算：futureMonths=0 → 返回空数组 []
  it("futureMonths=0 → 返回空数组", () => {
    expect(linearForecast([90, 92, 94], 0)).toEqual([]);
  });
});

describe("buildForecastChart 组装", () => {
  // 手算：history 长度=3，forecast 长度=3
  it("history 长度=3，forecast 长度=3", () => {
    const history = [90, 92, 94];
    const forecast = linearForecast(history, 3);
    const chart = buildForecastChart(history, forecast);
    expect(chart.history.length).toBe(3);
    expect(chart.forecast.length).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-trend-forecast auth:true", () => {
    const def = (emrTrendForecastV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-trend-forecast");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

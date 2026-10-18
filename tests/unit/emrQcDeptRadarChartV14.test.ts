/**
 * 健澜科技 jlmedaios - 质控科室对比雷达图 V14 单测（M506-B）
 *
 * 测试 buildRadarChart 构建、aggregateRadarChart 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateRadarChart,
  buildRadarChart,
  type RadarChartV14,
} from "../../src/bff/aggregators/emrQcDeptRadarChartV14Aggregator";
import { emrQcDeptRadarChartV14Routes } from "../../src/bff/routes/emrQcDeptRadarChartV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRadarChart 内科", () => {
  // 手算：dept='内科', dimensions=[书写规范90, 及时性85, 完整性95] → 正确构建
  it("dept='内科', dimensions=[书写规范90, 及时性85, 完整性95] → 正确构建", () => {
    const chart: RadarChartV14 = buildRadarChart("内科", [
      { name: "书写规范", score: 90 },
      { name: "及时性", score: 85 },
      { name: "完整性", score: 95 },
    ]);
    expect(chart.dept).toBe("内科");
    expect(chart.dimensions.length).toBe(3);
    expect(chart.dimensions[0].name).toBe("书写规范");
  });
});

describe("aggregateRadarChart 内科三维", () => {
  // 手算：内科+3 维度（90/85/95）
  // avgScore = (90+85+95)/3 = 270/3 = 90
  // totalDims = 3
  it("内科+3 维度（90/85/95）→ avgScore=90, totalDims=3", () => {
    const chart: RadarChartV14 = buildRadarChart("内科", [
      { name: "书写规范", score: 90 },
      { name: "及时性", score: 85 },
      { name: "完整性", score: 95 },
    ]);
    const result = aggregateRadarChart(chart);
    expect(result.dept).toBe("内科");
    expect(result.avgScore).toBe(90);
    expect(result.totalDims).toBe(3);
  });
});

describe("aggregateRadarChart 空维度", () => {
  // 手算：空维度 → avgScore=0, totalDims=0
  it("空维度 → avgScore=0, totalDims=0", () => {
    const chart: RadarChartV14 = buildRadarChart("内科", []);
    const result = aggregateRadarChart(chart);
    expect(result.avgScore).toBe(0);
    expect(result.totalDims).toBe(0);
  });
});

describe("buildRadarChart 外科", () => {
  // 手算：dept='外科', dimensions=[书写规范80, 及时性75] → 正确构建
  it("dept='外科', dimensions=[书写规范80, 及时性75] → 正确构建", () => {
    const chart: RadarChartV14 = buildRadarChart("外科", [
      { name: "书写规范", score: 80 },
      { name: "及时性", score: 75 },
    ]);
    expect(chart.dept).toBe("外科");
    expect(chart.dimensions.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-radar-chart auth:true", () => {
    const def = (emrQcDeptRadarChartV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-radar-chart");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

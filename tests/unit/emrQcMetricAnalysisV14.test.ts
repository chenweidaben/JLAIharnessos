/**
 * 健澜科技 jlmedaios - 质控指标分析 V14 单测（M483-D，M483 收官）
 *
 * 测试 compareMetricTrend 趋势对比、buildAnalysisReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compareMetricTrend,
  buildAnalysisReport,
  type MetricAnalysisReportV14,
} from "../../src/bff/aggregators/emrQcMetricAnalysisV14Aggregator";
import { emrQcMetricAnalysisV14Routes } from "../../src/bff/routes/emrQcMetricAnalysisV14";
import type { RouteDef } from "../../src/bff/types";

describe("compareMetricTrend 上升", () => {
  // 手算：current=95, previous=90 → 95-90=5 → change=5, direction='up'
  it("current=95, previous=90 → change=5, direction=up", () => {
    const result = compareMetricTrend(95, 90);
    expect(result.change).toBe(5);
    expect(result.direction).toBe("up");
  });
});

describe("compareMetricTrend 下降", () => {
  // 手算：current=85, previous=90 → 85-90=-5 → change=-5, direction='down'
  it("current=85, previous=90 → change=-5, direction=down", () => {
    const result = compareMetricTrend(85, 90);
    expect(result.change).toBe(-5);
    expect(result.direction).toBe("down");
  });
});

describe("compareMetricTrend 持平", () => {
  // 手算：current=90, previous=90 → 90-90=0 → change=0, direction='flat'
  it("current=90, previous=90 → change=0, direction=flat", () => {
    const result = compareMetricTrend(90, 90);
    expect(result.change).toBe(0);
    expect(result.direction).toBe("flat");
  });
});

describe("buildAnalysisReport 构建", () => {
  // 手算：metricName='完整率', currentValue=95, previousValue=90 → 正确构建
  it("metricName=完整率, currentValue=95, previousValue=90 → 正确构建", () => {
    const report: MetricAnalysisReportV14 = buildAnalysisReport("完整率", 95, 90);
    expect(report.metricName).toBe("完整率");
    expect(report.currentValue).toBe(95);
    expect(report.previousValue).toBe(90);
    expect(report.change).toBe(5);
    expect(report.direction).toBe("up");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-metric-analysis auth:true", () => {
    const def = (emrQcMetricAnalysisV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-metric-analysis");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

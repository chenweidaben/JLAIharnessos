/**
 * 健澜科技 jlmedaios - 质控指标计算 V14 单测（M483-B）
 *
 * 测试 calcQcMetric 指标值计算、aggregateQcMetrics 聚合、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  calcQcMetric,
  aggregateQcMetrics,
  type QcMetricResultV14,
} from "../../src/bff/aggregators/emrQcMetricCalcV14Aggregator";
import { emrQcMetricCalcV14Routes } from "../../src/bff/routes/emrQcMetricCalcV14";
import type { RouteDef } from "../../src/bff/types";

describe("calcQcMetric 完整率", () => {
  // 手算：name='完整率', numerator=950, denominator=1000 → 950/1000×100=95.0
  it("name=完整率, numerator=950, denominator=1000 → value=95.0", () => {
    const result: QcMetricResultV14 = calcQcMetric("完整率", 950, 1000);
    expect(result.value).toBeCloseTo(95.0);
  });
});

describe("calcQcMetric 缺陷率", () => {
  // 手算：name='缺陷率', numerator=50, denominator=1000 → 50/1000×100=5.0
  it("name=缺陷率, numerator=50, denominator=1000 → value=5.0", () => {
    const result: QcMetricResultV14 = calcQcMetric("缺陷率", 50, 1000);
    expect(result.value).toBeCloseTo(5.0);
  });
});

describe("calcQcMetric 分母为0", () => {
  // 手算：denominator=0 → value=0
  it("denominator=0 → value=0", () => {
    const result: QcMetricResultV14 = calcQcMetric("完整率", 950, 0);
    expect(result.value).toBe(0);
  });
});

describe("aggregateQcMetrics 聚合", () => {
  // 手算：3 个指标值 95/85/90 → (95+85+90)/3=90.0
  it("3 个指标值 95/85/90 → avgValue=90.0", () => {
    const metrics = [
      { name: "完整率", value: 95 },
      { name: "及时率", value: 85 },
      { name: "规范率", value: 90 },
    ];
    const result = aggregateQcMetrics(metrics);
    expect(result.avgValue).toBeCloseTo(90.0);
    expect(result.count).toBe(3);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-metric-calc auth:true", () => {
    const def = (emrQcMetricCalcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-metric-calc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

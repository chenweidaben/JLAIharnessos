/**
 * 健澜科技 jlmedaios - 质控指标钻取 V14 单测（M484-C）
 *
 * 测试 buildDrilldown 构建、filterByDimension 维度筛选、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDrilldown,
  filterByDimension,
  type DrilldownV14,
  type DimensionItemV14,
} from "../../src/bff/aggregators/emrQcMetricDrilldownV14Aggregator";
import { emrQcMetricDrilldownV14Routes } from "../../src/bff/routes/emrQcMetricDrilldownV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDrilldown 构建", () => {
  // 手算：metricName='完整率', 3 个科室数据 → 正确构建
  it("metricName=完整率, 3 个科室数据 → 正确构建", () => {
    const dimensions: DimensionItemV14[] = [
      { dept: "内科", value: 95 },
      { dept: "外科", value: 85 },
      { dept: "儿科", value: 90 },
    ];
    const drilldown: DrilldownV14 = buildDrilldown("完整率", dimensions);
    expect(drilldown.metricName).toBe("完整率");
    expect(drilldown.dimensions.length).toBe(3);
  });
});

describe("filterByDimension 内科", () => {
  // 手算：[{内科,95},{外科,85}], dept='内科' → 返回 1 条
  it("[{dept:内科,value:95},{dept:外科,value:85}], dept=内科 → 返回 1 条", () => {
    const dimensions: DimensionItemV14[] = [
      { dept: "内科", value: 95 },
      { dept: "外科", value: 85 },
    ];
    const result = filterByDimension(dimensions, "内科");
    expect(result.length).toBe(1);
    expect(result[0].dept).toBe("内科");
  });
});

describe("filterByDimension 不存在", () => {
  // 手算：dept='不存在xyz' → 返回空数组
  it("dept=不存在xyz → 返回空数组", () => {
    const dimensions: DimensionItemV14[] = [
      { dept: "内科", value: 95 },
      { dept: "外科", value: 85 },
    ];
    const result = filterByDimension(dimensions, "不存在xyz");
    expect(result.length).toBe(0);
  });
});

describe("filterByDimension 空数组", () => {
  // 手算：空 dimensions → 返回空数组
  it("空 dimensions → 返回空数组", () => {
    const dimensions: DimensionItemV14[] = [];
    const result = filterByDimension(dimensions, "内科");
    expect(result.length).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-metric-drilldown auth:true", () => {
    const def = (emrQcMetricDrilldownV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-metric-drilldown");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

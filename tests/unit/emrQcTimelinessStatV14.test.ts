/**
 * 健澜科技 jlmedaios - 质控时效统计 V14 单测（M500-C）
 *
 * 测试 buildTimelinessStat 构建、aggregateTimelinessStat 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateTimelinessStat,
  buildTimelinessStat,
  type TimelinessStatV14,
} from "../../src/bff/aggregators/emrQcTimelinessStatV14Aggregator";
import { emrQcTimelinessStatV14Routes } from "../../src/bff/routes/emrQcTimelinessStatV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTimelinessStat 内科", () => {
  // 手算：dept='内科', avgHours=24 → 正确构建
  it("dept='内科', avgHours=24 → 正确构建", () => {
    const stat: TimelinessStatV14 = buildTimelinessStat("内科", 24);
    expect(stat.dept).toBe("内科");
    expect(stat.avgHours).toBe(24);
  });
});

describe("aggregateTimelinessStat 三科室", () => {
  // 手算：3 科室（内科24h/外科48h/儿科12h）→ avgHours=28.0（(24+48+12)/3=84/3=28）, depts=3
  it("3 科室 → avgHours=28.0, depts=3", () => {
    const stats: TimelinessStatV14[] = [
      buildTimelinessStat("内科", 24),
      buildTimelinessStat("外科", 48),
      buildTimelinessStat("儿科", 12),
    ];
    const result = aggregateTimelinessStat(stats);
    expect(result.avgHours).toBeCloseTo(28.0);
    expect(result.depts).toBe(3);
  });
});

describe("aggregateTimelinessStat 空数组", () => {
  // 手算：空数组 → avgHours=0, depts=0
  it("空数组 → avgHours=0, depts=0", () => {
    const stats: TimelinessStatV14[] = [];
    const result = aggregateTimelinessStat(stats);
    expect(result.avgHours).toBe(0);
    expect(result.depts).toBe(0);
  });
});

describe("buildTimelinessStat 急诊", () => {
  // 手算：dept='急诊', avgHours=2 → 正确构建
  it("dept='急诊', avgHours=2 → 正确构建", () => {
    const stat: TimelinessStatV14 = buildTimelinessStat("急诊", 2);
    expect(stat.dept).toBe("急诊");
    expect(stat.avgHours).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-timeliness-stat auth:true", () => {
    const def = (emrQcTimelinessStatV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-timeliness-stat");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

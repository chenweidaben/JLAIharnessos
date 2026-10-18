/**
 * 健澜科技 jlmedaios - 质控合格率统计 V14 单测（M500-B）
 *
 * 测试 buildPassRateStat 构建、aggregatePassRateStat 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregatePassRateStat,
  buildPassRateStat,
  type PassRateStatV14,
} from "../../src/bff/aggregators/emrQcPassRateStatV14Aggregator";
import { emrQcPassRateStatV14Routes } from "../../src/bff/routes/emrQcPassRateStatV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPassRateStat 内科", () => {
  // 手算：dept='内科', passCount=95, total=100 → 正确构建（rate=95.0）
  it("dept='内科', passCount=95, total=100 → 正确构建", () => {
    const stat: PassRateStatV14 = buildPassRateStat("内科", 95, 100);
    expect(stat.dept).toBe("内科");
    expect(stat.passCount).toBe(95);
    expect(stat.total).toBe(100);
    expect(stat.rate).toBeCloseTo(95.0);
  });
});

describe("aggregatePassRateStat 三科室", () => {
  // 手算：3 科室（内科95%, 外科90%, 儿科88%）→ avgRate=91.0（(95+90+88)/3=273/3=91）, depts=3
  it("3 科室 → avgRate=91.0, depts=3", () => {
    const stats: PassRateStatV14[] = [
      buildPassRateStat("内科", 95, 100),
      buildPassRateStat("外科", 90, 100),
      buildPassRateStat("儿科", 88, 100),
    ];
    const result = aggregatePassRateStat(stats);
    expect(result.avgRate).toBeCloseTo(91.0);
    expect(result.depts).toBe(3);
  });
});

describe("aggregatePassRateStat 空数组", () => {
  // 手算：空数组 → avgRate=0, depts=0
  it("空数组 → avgRate=0, depts=0", () => {
    const stats: PassRateStatV14[] = [];
    const result = aggregatePassRateStat(stats);
    expect(result.avgRate).toBe(0);
    expect(result.depts).toBe(0);
  });
});

describe("buildPassRateStat 外科", () => {
  // 手算：dept='外科', passCount=88, total=100 → 正确构建（rate=88.0）
  it("dept='外科', passCount=88, total=100 → 正确构建", () => {
    const stat: PassRateStatV14 = buildPassRateStat("外科", 88, 100);
    expect(stat.dept).toBe("外科");
    expect(stat.rate).toBeCloseTo(88.0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-pass-rate-stat auth:true", () => {
    const def = (emrQcPassRateStatV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-pass-rate-stat");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

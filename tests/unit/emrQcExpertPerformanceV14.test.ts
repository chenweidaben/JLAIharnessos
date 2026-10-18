/**
 * 健澜科技 jlmedaios - 质控专家绩效统计 V14 单测（M502-D，M502 收官）
 *
 * 测试 buildExpertPerformance 构建、aggregateExpertPerformance 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateExpertPerformance,
  buildExpertPerformance,
  type ExpertPerformanceV14,
} from "../../src/bff/aggregators/emrQcExpertPerformanceV14Aggregator";
import { emrQcExpertPerformanceV14Routes } from "../../src/bff/routes/emrQcExpertPerformanceV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExpertPerformance 张教授", () => {
  // 手算：expert='张教授', reviewedCount=15, avgScore=92.5 → 正确构建
  it("expert='张教授', reviewedCount=15, avgScore=92.5 → 正确构建", () => {
    const perf: ExpertPerformanceV14 = buildExpertPerformance("张教授", 15, 92.5);
    expect(perf.expert).toBe("张教授");
    expect(perf.reviewedCount).toBe(15);
    expect(perf.avgScore).toBeCloseTo(92.5);
  });
});

describe("aggregateExpertPerformance 三专家", () => {
  // 手算：3 专家（张教授15/92.5, 李教授10/88.0, 王教授8/85.5）
  // totalReviews = 15+10+8 = 33
  // avgScore = (92.5+88.0+85.5)/3 = 266/3 ≈ 88.7
  it("3 专家 → totalReviews=33, avgScore=88.7", () => {
    const perf: ExpertPerformanceV14[] = [
      buildExpertPerformance("张教授", 15, 92.5),
      buildExpertPerformance("李教授", 10, 88.0),
      buildExpertPerformance("王教授", 8, 85.5),
    ];
    const result = aggregateExpertPerformance(perf);
    expect(result.totalReviews).toBe(33);
    expect(result.avgScore).toBeCloseTo(88.7);
  });
});

describe("aggregateExpertPerformance 空数组", () => {
  // 手算：空数组 → totalReviews=0, avgScore=0
  it("空数组 → totalReviews=0, avgScore=0", () => {
    const perf: ExpertPerformanceV14[] = [];
    const result = aggregateExpertPerformance(perf);
    expect(result.totalReviews).toBe(0);
    expect(result.avgScore).toBe(0);
  });
});

describe("buildExpertPerformance 王教授", () => {
  // 手算：expert='王教授', reviewedCount=8, avgScore=85.5 → 正确构建
  it("expert='王教授', reviewedCount=8, avgScore=85.5 → 正确构建", () => {
    const perf: ExpertPerformanceV14 = buildExpertPerformance("王教授", 8, 85.5);
    expect(perf.expert).toBe("王教授");
    expect(perf.reviewedCount).toBe(8);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-expert-performance auth:true", () => {
    const def = (emrQcExpertPerformanceV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-expert-performance");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

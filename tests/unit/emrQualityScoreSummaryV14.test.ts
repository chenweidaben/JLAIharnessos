/**
 * 健澜科技 jlmedaios - 病历质量评分汇总 V14 单测（M481-D，M481 收官，-summary 避让 M465-B）
 *
 * 测试 buildQualityScore 构建、aggregateQualityScore 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateQualityScore,
  buildQualityScore,
  type QualityScoreSummaryV14,
} from "../../src/bff/aggregators/emrQualityScoreSummaryV14Aggregator";
import { emrQualityScoreSummaryV14Routes } from "../../src/bff/routes/emrQualityScoreSummaryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQualityScore 构建", () => {
  // 手算：dept='内科', score=88 → 正确构建
  it("dept=内科, score=88 → 正确构建", () => {
    const record: QualityScoreSummaryV14 = buildQualityScore("内科", 88);
    expect(record.dept).toBe("内科");
    expect(record.score).toBe(88);
  });
});

describe("aggregateQualityScore 两科室", () => {
  // 手算：内科 80/90 → (80+90)/2 = 85.0；外科 85/95 → (85+95)/2 = 90.0
  it("内科 80/90, 外科 85/95 → 内科 avg=85.0, 外科 avg=90.0", () => {
    const scores: QualityScoreSummaryV14[] = [
      buildQualityScore("内科", 80),
      buildQualityScore("内科", 90),
      buildQualityScore("外科", 85),
      buildQualityScore("外科", 95),
    ];
    const result = aggregateQualityScore(scores);
    expect(result.length).toBe(2);
    const neike = result.find((r) => r.dept === "内科");
    const waike = result.find((r) => r.dept === "外科");
    expect(neike?.avgScore).toBeCloseTo(85.0);
    expect(waike?.avgScore).toBeCloseTo(90.0);
  });
});

describe("aggregateQualityScore 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    const result = aggregateQualityScore([]);
    expect(result).toEqual([]);
  });
});

describe("aggregateQualityScore 单个科室", () => {
  // 手算：单个科室 1 条 → 返回 1 条
  it("单个科室 → 返回 1 条", () => {
    const scores: QualityScoreSummaryV14[] = [buildQualityScore("内科", 88)];
    const result = aggregateQualityScore(scores);
    expect(result.length).toBe(1);
    expect(result[0].dept).toBe("内科");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-quality-score-summary auth:true", () => {
    const def = (emrQualityScoreSummaryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-quality-score-summary");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

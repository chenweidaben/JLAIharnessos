/**
 * 健澜科技 jlmedaios - 病历质量实时评分仪表盘 V14 单测（M465-B）
 *
 * 测试 computeQualityScore 0缺陷→100、1 block→85、3 block→55、rankByScore 降序排名、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeQualityScore,
  rankByScore,
  type QualityScoreInputV14,
} from "../../src/bff/aggregators/emrQualityScoreV14Aggregator";
import { emrQualityScoreV14Routes } from "../../src/bff/routes/emrQualityScoreV14";
import type { RouteDef } from "../../src/bff/types";

describe("computeQualityScore 0 缺陷", () => {
  // 手算：100 - 0 - 0 - 0 = 100
  it("0 缺陷 → 100", () => {
    expect(computeQualityScore(0, 0, 0, 0)).toBe(100);
  });
});

describe("computeQualityScore 1 block", () => {
  // 手算：100 - 1*15 - 0 - 0 = 100 - 15 = 85
  it("1 block → 100-15=85", () => {
    expect(computeQualityScore(0, 1, 0, 0)).toBe(85);
  });
});

describe("computeQualityScore 3 block", () => {
  // 手算：100 - 3*15 - 0 - 0 = 100 - 45 = 55
  it("3 block → 100-45=55", () => {
    expect(computeQualityScore(0, 3, 0, 0)).toBe(55);
  });
});

describe("rankByScore 降序排名", () => {
  // 手算：A=0缺陷→100, B=1block→85, C=2block+1major→100-30-8=62
  // 排名：A(1,100), B(2,85), C(3,62)
  it("3 个科室按 score 降序排名正确", () => {
    const items: QualityScoreInputV14[] = [
      { name: "科室A", block: 0, major: 0, minor: 0 },
      { name: "科室B", block: 1, major: 0, minor: 0 },
      { name: "科室C", block: 2, major: 1, minor: 0 },
    ];
    const ranking = rankByScore(items);
    expect(ranking[0]?.name).toBe("科室A");
    expect(ranking[0]?.rank).toBe(1);
    expect(ranking[1]?.name).toBe("科室B");
    expect(ranking[1]?.rank).toBe(2);
    expect(ranking[2]?.name).toBe("科室C");
    expect(ranking[2]?.rank).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-quality-score auth:true", () => {
    const def = (emrQualityScoreV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-quality-score");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 质控护士评分 V14 单测（M494-B）
 *
 * 测试 buildNurseScore 构建、aggregateNurseScores 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNurseScore,
  aggregateNurseScores,
  type NurseScoreV14,
} from "../../src/bff/aggregators/emrQcNurseScoreV14Aggregator";
import { emrQcNurseScoreV14Routes } from "../../src/bff/routes/emrQcNurseScoreV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNurseScore 王护士", () => {
  // 手算：nurse='王护士', ward='内科病房', score=90 → 正确构建
  it("nurse='王护士', ward='内科病房', score=90 → 正确构建", () => {
    const score: NurseScoreV14 = buildNurseScore("王护士", "内科病房", 90);
    expect(score.nurse).toBe("王护士");
    expect(score.ward).toBe("内科病房");
    expect(score.score).toBe(90);
  });
});

describe("aggregateNurseScores 3护士", () => {
  // 手算：3 个护士（90/88/92）→ count=3, avgScore=90.0（(90+88+92)/3=270/3=90）, maxScore=92
  it("3 个护士（90/88/92）→ count=3, avgScore=90.0, maxScore=92", () => {
    const scores = [
      { nurse: "王护士", score: 90 },
      { nurse: "张护士", score: 88 },
      { nurse: "刘护士", score: 92 },
    ];
    const result = aggregateNurseScores(scores);
    expect(result.count).toBe(3);
    expect(result.avgScore).toBeCloseTo(90.0);
    expect(result.maxScore).toBe(92);
  });
});

describe("aggregateNurseScores 空数组", () => {
  // 手算：空数组 → count=0, avgScore=0
  it("空数组 → count=0, avgScore=0", () => {
    const scores: { nurse: string; score: number }[] = [];
    const result = aggregateNurseScores(scores);
    expect(result.count).toBe(0);
    expect(result.avgScore).toBe(0);
  });
});

describe("buildNurseScore 刘护士", () => {
  // 手算：nurse='刘护士', ward='外科病房', score=85 → 正确构建
  it("nurse='刘护士', ward='外科病房', score=85 → 正确构建", () => {
    const score: NurseScoreV14 = buildNurseScore("刘护士", "外科病房", 85);
    expect(score.nurse).toBe("刘护士");
    expect(score.ward).toBe("外科病房");
    expect(score.score).toBe(85);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-nurse-score auth:true", () => {
    const def = (emrQcNurseScoreV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-nurse-score");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

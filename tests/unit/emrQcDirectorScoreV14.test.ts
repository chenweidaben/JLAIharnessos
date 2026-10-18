/**
 * 健澜科技 jlmedaios - 质控科室主任评分 V14 单测（M494-C）
 *
 * 测试 buildDirectorScore 构建、aggregateDirectorScores 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDirectorScore,
  aggregateDirectorScores,
  type DirectorScoreV14,
} from "../../src/bff/aggregators/emrQcDirectorScoreV14Aggregator";
import { emrQcDirectorScoreV14Routes } from "../../src/bff/routes/emrQcDirectorScoreV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDirectorScore 陈主任", () => {
  // 手算：director='陈主任', dept='内科', score=95 → 正确构建
  it("director='陈主任', dept='内科', score=95 → 正确构建", () => {
    const score: DirectorScoreV14 = buildDirectorScore("陈主任", "内科", 95);
    expect(score.director).toBe("陈主任");
    expect(score.dept).toBe("内科");
    expect(score.score).toBe(95);
  });
});

describe("aggregateDirectorScores 3主任", () => {
  // 手算：3 个主任（95/90/92）→ count=3, avgScore=92.3（(95+90+92)/3=277/3≈92.33→保留1位=92.3）, maxScore=95
  it("3 个主任（95/90/92）→ count=3, avgScore=92.3, maxScore=95", () => {
    const scores = [
      { director: "陈主任", score: 95 },
      { director: "王主任", score: 90 },
      { director: "赵主任", score: 92 },
    ];
    const result = aggregateDirectorScores(scores);
    expect(result.count).toBe(3);
    expect(result.avgScore).toBeCloseTo(92.3);
    expect(result.maxScore).toBe(95);
  });
});

describe("aggregateDirectorScores 空数组", () => {
  // 手算：空数组 → count=0, avgScore=0
  it("空数组 → count=0, avgScore=0", () => {
    const scores: { director: string; score: number }[] = [];
    const result = aggregateDirectorScores(scores);
    expect(result.count).toBe(0);
    expect(result.avgScore).toBe(0);
  });
});

describe("buildDirectorScore 刘主任", () => {
  // 手算：director='刘主任', dept='外科', score=88 → 正确构建
  it("director='刘主任', dept='外科', score=88 → 正确构建", () => {
    const score: DirectorScoreV14 = buildDirectorScore("刘主任", "外科", 88);
    expect(score.director).toBe("刘主任");
    expect(score.dept).toBe("外科");
    expect(score.score).toBe(88);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-director-score auth:true", () => {
    const def = (emrQcDirectorScoreV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-director-score");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

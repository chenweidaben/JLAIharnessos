/**
 * 健澜科技 jlmedaios - 质控科室排名 V14 单测（M493-C）
 *
 * 测试 buildDeptRanking 构建、rankDepts 排名、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptRanking,
  rankDepts,
  type DeptRankingV14,
  type DeptScoreV14,
} from "../../src/bff/aggregators/emrQcDeptRankingV14Aggregator";
import { emrQcDeptRankingV14Routes } from "../../src/bff/routes/emrQcDeptRankingV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptRanking 内科第1", () => {
  // 手算：dept='内科', score=95, rank=1 → 正确构建
  it("dept='内科', score=95, rank=1 → 正确构建", () => {
    const ranking: DeptRankingV14 = buildDeptRanking("内科", 95, 1);
    expect(ranking.dept).toBe("内科");
    expect(ranking.score).toBe(95);
    expect(ranking.rank).toBe(1);
  });
});

describe("rankDepts 3科室", () => {
  // 手算：[{内科,92},{外科,85},{儿科,95}] → 排名后第一名=儿科（95>92>85）
  it("3 科室排名后第一名=儿科（95>92>85）", () => {
    const depts: DeptScoreV14[] = [
      { dept: "内科", score: 92 },
      { dept: "外科", score: 85 },
      { dept: "儿科", score: 95 },
    ];
    const rankings = rankDepts(depts);
    expect(rankings[0].dept).toBe("儿科");
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].dept).toBe("内科");
    expect(rankings[1].rank).toBe(2);
    expect(rankings[2].dept).toBe("外科");
    expect(rankings[2].rank).toBe(3);
  });
});

describe("rankDepts 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    const depts: DeptScoreV14[] = [];
    const rankings = rankDepts(depts);
    expect(rankings.length).toBe(0);
  });
});

describe("buildDeptRanking 外科第2", () => {
  // 手算：dept='外科', score=85, rank=2 → 正确构建
  it("dept='外科', score=85, rank=2 → 正确构建", () => {
    const ranking: DeptRankingV14 = buildDeptRanking("外科", 85, 2);
    expect(ranking.dept).toBe("外科");
    expect(ranking.score).toBe(85);
    expect(ranking.rank).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-ranking auth:true", () => {
    const def = (emrQcDeptRankingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-ranking");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 病历科室质控排行榜 V14 单测（M470-B，-board 后缀避让）
 *
 * 测试 rankDeptsByScore 排名+升降趋势、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  rankDeptsByScore,
  type DeptScoreInputV14,
} from "../../src/bff/aggregators/emrQcRankingBoardV14Aggregator";
import { emrQcRankingBoardV14Routes } from "../../src/bff/routes/emrQcRankingBoardV14";
import type { RouteDef } from "../../src/bff/types";

describe("rankDeptsByScore 排名", () => {
  // 手算：内科 95 / 外科 88 / 儿科 92 → 按 score 降序：内科 95 > 儿科 92 > 外科 88
  // 排名：内科 rank=1，儿科 rank=2，外科 rank=3
  it("内科 95 / 外科 88 / 儿科 92 → 排名 内科1/儿科2/外科3", () => {
    const depts: DeptScoreInputV14[] = [
      { name: "内科", score: 95 },
      { name: "外科", score: 88 },
      { name: "儿科", score: 92 },
    ];
    const ranked = rankDeptsByScore(depts);
    expect(ranked[0]?.name).toBe("内科");
    expect(ranked[1]?.name).toBe("儿科");
    expect(ranked[2]?.name).toBe("外科");
  });
});

describe("rankDeptsByScore trend=up", () => {
  // 手算：内科 prevRank=3，新 rank=1 → rank(1) < prevRank(3) → trend='up'
  it("内科 prevRank=3, 新rank=1 → trend='up'", () => {
    const depts: DeptScoreInputV14[] = [{ name: "内科", score: 95, prevRank: 3 }];
    const ranked = rankDeptsByScore(depts);
    expect(ranked[0]?.trend).toBe("up");
  });
});

describe("rankDeptsByScore trend=down", () => {
  // 手算：内科 95 > 儿科 92 > 外科 88 → 外科新 rank=3
  // 外科 prevRank=1，新 rank=3 > prevRank=1 → trend='down'
  it("外科 prevRank=1, 新rank=3 → trend='down'", () => {
    const depts: DeptScoreInputV14[] = [
      { name: "内科", score: 95 },
      { name: "儿科", score: 92 },
      { name: "外科", score: 88, prevRank: 1 },
    ];
    const ranked = rankDeptsByScore(depts);
    const surgery = ranked.find((r) => r.name === "外科");
    expect(surgery?.trend).toBe("down");
  });
});

describe("rankDeptsByScore trend=same（无 prevRank）", () => {
  // 手算：无 prevRank → 默认 trend='same'
  it("无 prevRank → trend='same'", () => {
    const depts: DeptScoreInputV14[] = [{ name: "儿科", score: 92 }];
    const ranked = rankDeptsByScore(depts);
    expect(ranked[0]?.trend).toBe("same");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-ranking-board auth:true", () => {
    const def = (emrQcRankingBoardV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-ranking-board");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 病历质控满意度调查 V14 单测（M469-D，M469 收官）
 *
 * 测试 computeSatisfactionScore 平均分、rankBySatisfaction 排名、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSatisfactionScore,
  rankBySatisfaction,
  type SatisfactionResponseV14,
} from "../../src/bff/aggregators/emrSatisfactionV14Aggregator";
import { emrSatisfactionV14Routes } from "../../src/bff/routes/emrSatisfactionV14";
import type { RouteDef } from "../../src/bff/types";

describe("computeSatisfactionScore 内科", () => {
  // 手算：内科 3 次评分 90/80/100 → (90+80+100)/3 = 270/3 = 90.0
  it("内科 3 次 90/80/100 → avg=90", () => {
    const responses: SatisfactionResponseV14[] = [
      { dept: "内科", score: 90 },
      { dept: "内科", score: 80 },
      { dept: "内科", score: 100 },
    ];
    const result = computeSatisfactionScore(responses);
    expect(result[0]?.avgScore).toBe(90);
    expect(result[0]?.count).toBe(3);
  });
});

describe("computeSatisfactionScore 外科", () => {
  // 手算：外科 2 次 70/80 → (70+80)/2 = 150/2 = 75.0
  it("外科 2 次 70/80 → avg=75", () => {
    const responses: SatisfactionResponseV14[] = [
      { dept: "外科", score: 70 },
      { dept: "外科", score: 80 },
    ];
    const result = computeSatisfactionScore(responses);
    expect(result[0]?.avgScore).toBe(75);
  });
});

describe("computeSatisfactionScore 空数组", () => {
  // 手算：空数组 → 返回空数组 []
  it("空数组 → 返回空数组", () => {
    expect(computeSatisfactionScore([])).toEqual([]);
  });
});

describe("rankBySatisfaction 排名", () => {
  // 手算：内科 avg=90 > 外科 avg=75 → 内科 rank=1，外科 rank=2
  it("内科 avg=90 > 外科 avg=75 → 内科 rank=1", () => {
    const responses: SatisfactionResponseV14[] = [
      { dept: "内科", score: 90 },
      { dept: "外科", score: 75 },
    ];
    const aggregated = computeSatisfactionScore(responses);
    const ranked = rankBySatisfaction(aggregated);
    expect(ranked[0]?.dept).toBe("内科");
    expect(ranked[0]?.rank).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-satisfaction auth:true", () => {
    const def = (emrSatisfactionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-satisfaction");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

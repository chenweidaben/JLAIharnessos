/**
 * 健澜科技 jlmedaios - 科室病历质控评分排名 V14 单测（M461-D）
 *
 * 测试 computeDeptQcScore 0 缺陷→100、1 block→85、3 block→55、rankDepts 降序排名、读路由 GET auth:true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeptQcScore,
  rankDepts,
  type DeptQcItemV14,
} from "../../src/bff/aggregators/emrQcRankingV14Aggregator";
import { emrQcRankingV14Routes } from "../../src/bff/routes/emrQcRankingV14";
import type { RouteDef } from "../../src/bff/types";

describe("computeDeptQcScore 0 缺陷", () => {
  // 手算：0 block + 0 major + 0 minor → 100 - 0 = 100
  it("0 缺陷 → 100", () => {
    expect(computeDeptQcScore(100, 0, 0, 0)).toBe(100);
  });
});

describe("computeDeptQcScore 1 block", () => {
  // 手算：1 block → 100 - 15 = 85
  it("1 block → 100-15=85", () => {
    expect(computeDeptQcScore(100, 1, 0, 0)).toBe(85);
  });
});

describe("computeDeptQcScore 3 block", () => {
  // 手算：3 block → 100 - 3*15 = 100 - 45 = 55
  it("3 block → 100-45=55", () => {
    expect(computeDeptQcScore(100, 3, 0, 0)).toBe(55);
  });
});

describe("rankDepts 降序排名", () => {
  // 手算：
  //   心内科：0 block + 1 major + 2 minor → 100 - 0 - 8 - 6 = 86
  //   普外科：1 block + 2 major + 3 minor → 100 - 15 - 16 - 9 = 60
  //   骨科：2 block + 3 major + 5 minor → 100 - 30 - 24 - 15 = 31
  //   降序：心内科(86) → 第1名，普外科(60) → 第2名，骨科(31) → 第3名
  it("3 个科室按 score 降序排名正确", () => {
    const items: DeptQcItemV14[] = [
      { dept: "普外科", passed: 88, block: 1, major: 2, minor: 3 },
      { dept: "心内科", passed: 95, block: 0, major: 1, minor: 2 },
      { dept: "骨科", passed: 75, block: 2, major: 3, minor: 5 },
    ];
    const ranking = rankDepts(items);
    expect(ranking.length).toBe(3);
    expect(ranking[0].dept).toBe("心内科");
    expect(ranking[0].score).toBe(86);
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].dept).toBe("普外科");
    expect(ranking[1].score).toBe(60);
    expect(ranking[1].rank).toBe(2);
    expect(ranking[2].dept).toBe("骨科");
    expect(ranking[2].score).toBe(31);
    expect(ranking[2].rank).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-ranking auth:true", () => {
    const def = (emrQcRankingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-ranking");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

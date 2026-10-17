/**
 * 健澜科技 jlmedaios - 学科建设 V13 单测（M397-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDisciplineLeaderCountV13,
  computeKeyDisciplineCountV13,
  computeSpecialtyReputationRankV13,
  type DisciplineConstructionRecordV13,
} from "../../src/bff/aggregators/disciplineConstructionV13Aggregator";
import { disciplineConstructionV13Routes } from "../../src/bff/routes/disciplineConstructionV13";

const records: DisciplineConstructionRecordV13[] = [
  { keyDisciplineCount: 5, leaderCount: 3, rank: 5, deptName: "心血管内科" },
  { keyDisciplineCount: 5, leaderCount: 3, rank: 8, deptName: "消化内科" },
];

describe("computeKeyDisciplineCountV13", () => {
  // 算式：5+5 = 10
  it("重点学科数 = 10 个", () => {
    expect(computeKeyDisciplineCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeKeyDisciplineCountV13([])).toBe(0);
  });
});

describe("computeDisciplineLeaderCountV13", () => {
  // 算式：3+3 = 6
  it("学科带头人数量 = 6 人", () => {
    expect(computeDisciplineLeaderCountV13(records)).toBe(6);
  });
});

describe("computeSpecialtyReputationRankV13", () => {
  // 算式：取第一条记录 {rank: 5, deptName: "心血管内科"}
  it("专科声誉排名 = {rank: 5, deptName: 心血管内科}", () => {
    expect(computeSpecialtyReputationRankV13(records)).toEqual({ rank: 5, deptName: "心血管内科" });
  });
});

describe("disciplineConstructionV13Routes 读路由", () => {
  it("GET /api/v1/discipline-construction 路由存在且 auth:true", () => {
    const route = disciplineConstructionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/discipline-construction",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 学科竞赛 V13 单测（M403-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBestSpecialtyReputationCountV13,
  computeFudanRankingCountV13,
  computeNationalClinicalKeySpecialtyRankingV13,
  type DisciplineCompetitionRecordV13,
} from "../../src/bff/aggregators/disciplineCompetitionV13Aggregator";
import { disciplineCompetitionV13Routes } from "../../src/bff/routes/disciplineCompetitionV13";

const records: DisciplineCompetitionRecordV13[] = [
  { nationalRanking: 10, fudanCount: 5, reputationCount: 3 },
  { nationalRanking: 10, fudanCount: 5, reputationCount: 3 },
];

describe("computeNationalClinicalKeySpecialtyRankingV13", () => {
  // 算式：Math.min(10, 10) = 10
  it("国家临床重点专科最佳排名 = 10 名", () => {
    expect(computeNationalClinicalKeySpecialtyRankingV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeNationalClinicalKeySpecialtyRankingV13([])).toBe(0);
  });
});

describe("computeFudanRankingCountV13", () => {
  // 算式：5+5 = 10
  it("复旦排行榜上榜数 = 10 个", () => {
    expect(computeFudanRankingCountV13(records)).toBe(10);
  });
});

describe("computeBestSpecialtyReputationCountV13", () => {
  // 算式：3+3 = 6
  it("最佳专科声誉数 = 6 个", () => {
    expect(computeBestSpecialtyReputationCountV13(records)).toBe(6);
  });
});

describe("disciplineCompetitionV13Routes 读路由", () => {
  it("GET /api/v1/discipline-competition 路由存在且 auth:true", () => {
    const route = disciplineCompetitionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/discipline-competition",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

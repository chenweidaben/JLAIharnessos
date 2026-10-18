/**
 * 健澜科技 jlmedaios - 学科建设质量管理 V13 单测（M434-D，M434 收官，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDisciplineInfluenceScoreV13,
  computeDisciplineKeyDisciplineCountV13,
  computeDisciplineLeaderCountV13,
  type DisciplineConstructionQualityMgmtRecordV13,
} from "../../src/bff/aggregators/disciplineConstructionQualityMgmtV13Aggregator";
import { disciplineConstructionQualityMgmtV13Routes } from "../../src/bff/routes/disciplineConstructionQualityMgmtV13";

const records: DisciplineConstructionQualityMgmtRecordV13[] = [
  { keyDisciplineCount: 5, leaderCount: 8, influenceScore: 85.5 },
  { keyDisciplineCount: 5, leaderCount: 8, influenceScore: 90.5 },
];

describe("computeDisciplineKeyDisciplineCountV13", () => {
  // 算式：5 + 5 = 10 个（整数求和类）
  it("重点学科数 = 10 个（整数求和类）", () => {
    expect(computeDisciplineKeyDisciplineCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeDisciplineKeyDisciplineCountV13([])).toBe(0);
  });
});

describe("computeDisciplineLeaderCountV13", () => {
  // 算式：8 + 8 = 16 人（整数求和类）
  it("学科带头人人数 = 16 人（整数求和类）", () => {
    expect(computeDisciplineLeaderCountV13(records)).toBe(16);
  });
});

describe("computeDisciplineInfluenceScoreV13", () => {
  // 算式：(85.5 + 90.5) / 2 = 176 / 2 = 88.00（平均值，保留 2 位小数）
  it("学科影响力评分 = 88.00（平均值）", () => {
    expect(computeDisciplineInfluenceScoreV13(records)).toBeCloseTo(88.00, 2);
  });
});

describe("disciplineConstructionQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/discipline-construction-quality-mgmt 路由存在且 auth:true", () => {
    const route = disciplineConstructionQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/discipline-construction-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

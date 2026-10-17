/**
 * 健澜科技 jlmedaios - 知识贡献生态总览 V13 单测（M298-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildEcosystemDashboardV13,
  computeEcosystemHealthV13,
  identifyEcosystemGapV13,
  type EcoEntryV13,
  type MentorPairV13,
} from "../../src/bff/aggregators/ecosystemDashboardV13Aggregator";
import { ecosystemDashboardV13Routes } from "../../src/bff/routes/ecosystemDashboardV13";

const leaderboard: EcoEntryV13[] = [
  { doctorId: "d-1", name: "张主任", score: 69 },
  { doctorId: "d-2", name: "李医生", score: 38 },
  { doctorId: "d-3", name: "王医生", score: 21 },
];

const pairs: MentorPairV13[] = [
  { mentorId: "m-1", newDoctorId: "n-1", dept: "cardio" },
];

const newDoctors: EcoEntryV13[] = [
  { doctorId: "n-1", name: "小陈", score: 0 },
];

describe("buildEcosystemDashboardV13", () => {
  it("3贡献者/1月度之星/1师徒对/1新医生", () => {
    const d = buildEcosystemDashboardV13(leaderboard, 1, pairs, newDoctors);
    expect(d.totalContributors).toBe(3);
    expect(d.monthlyStars).toBe(1);
    expect(d.activeMentorPairs).toBe(1);
    expect(d.newDoctorCount).toBe(1);
  });
  it("空态 → 全0", () => {
    const d = buildEcosystemDashboardV13([], 0, [], []);
    expect(d.totalContributors).toBe(0);
  });
});

describe("computeEcosystemHealthV13", () => {
  it("(30*0.4 + 20*0.3 + 50*0.3) = 12+6+15 = 33", () => {
    const d = buildEcosystemDashboardV13(leaderboard, 1, pairs, newDoctors);
    expect(computeEcosystemHealthV13(d)).toBe(33);
  });
});

describe("identifyEcosystemGapV13", () => {
  it("有新医生+有师徒对+贡献者>=3 → 无缺口", () => {
    const d = buildEcosystemDashboardV13(leaderboard, 1, pairs, newDoctors);
    expect(identifyEcosystemGapV13(d)).toBe("");
  });
  it("有新医生但无师徒对 → '导师稀缺'", () => {
    const d = buildEcosystemDashboardV13(leaderboard, 1, [], newDoctors);
    expect(identifyEcosystemGapV13(d)).toContain("导师稀缺");
  });
});

describe("ecosystemDashboardV13Routes 读路由", () => {
  it("GET /api/v1/ecosystem-dashboard 路由存在且 auth:true", () => {
    const route = ecosystemDashboardV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ecosystem-dashboard",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

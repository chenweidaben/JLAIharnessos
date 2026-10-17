/**
 * 健澜科技 jlmedaios - 专家经验贡献激励 V13 单测（M298-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  awardBadgeV13,
  buildContributionLeaderboardV13,
  computeContributionScoreV13,
  type ContributorV13,
} from "../../src/bff/aggregators/contributionLeaderboardV13Aggregator";
import { contributionLeaderboardV13Routes } from "../../src/bff/routes/contributionLeaderboardV13";

const contributors: ContributorV13[] = [
  { doctorId: "d-1", name: "张主任", reuseCount: 10, adoptionRate: 80, errorReduction: 5 },
  { doctorId: "d-2", name: "李医生", reuseCount: 5, adoptionRate: 60, errorReduction: 2 },
  { doctorId: "d-3", name: "王医生", reuseCount: 2, adoptionRate: 40, errorReduction: 1 },
];

describe("computeContributionScoreV13", () => {
  it("d-1: 10*2+80*0.3+5*5 = 20+24+25 = 69", () => {
    expect(computeContributionScoreV13(10, 80, 5)).toBe(69);
  });
  it("clamp 100：reuse=100 adoption=100 err=10 → 200+30+50=280 → clamp=100", () => {
    expect(computeContributionScoreV13(100, 100, 10)).toBe(100);
  });
});

describe("awardBadgeV13", () => {
  it("80→传家宝 / 50→良师 / 30→分享者 / 10→新人", () => {
    expect(awardBadgeV13(80)).toBe("传家宝");
    expect(awardBadgeV13(50)).toBe("良师");
    expect(awardBadgeV13(30)).toBe("分享者");
    expect(awardBadgeV13(10)).toBe("新人");
  });
});

describe("buildContributionLeaderboardV13", () => {
  it("按分降序：d-1(69) d-2(38) d-3(21)", () => {
    const board = buildContributionLeaderboardV13(contributors);
    expect(board[0].doctorId).toBe("d-1");
    expect(board[1].doctorId).toBe("d-2");
    expect(board[2].doctorId).toBe("d-3");
  });
  it("空态→0", () => {
    expect(buildContributionLeaderboardV13([]).length).toBe(0);
  });
});

describe("contributionLeaderboardV13Routes 读路由", () => {
  it("GET /api/v1/contribution-leaderboard 路由存在且 auth:true", () => {
    const route = contributionLeaderboardV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/contribution-leaderboard",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

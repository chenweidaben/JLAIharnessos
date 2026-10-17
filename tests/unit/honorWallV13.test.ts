/**
 * 健澜科技 jlmedaios - 贡献荣誉墙与月度之星 V13 单测（M298-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHonorWallV13,
  computeContributionTrendV13,
  selectMonthlyStarV13,
  type HonorEntryV13,
} from "../../src/bff/aggregators/honorWallV13Aggregator";
import { honorWallV13Routes } from "../../src/bff/routes/honorWallV13";

const leaderboard: HonorEntryV13[] = [
  { doctorId: "d-1", name: "张主任", score: 69, badge: "良师" },
  { doctorId: "d-2", name: "李医生", score: 38, badge: "分享者" },
  { doctorId: "d-3", name: "王医生", score: 21, badge: "新人" },
  { doctorId: "d-4", name: "赵医生", score: 15, badge: "新人" },
];

describe("buildHonorWallV13", () => {
  it("4条→top3=3 rest=1", () => {
    const wall = buildHonorWallV13(leaderboard);
    expect(wall.top3.length).toBe(3);
    expect(wall.rest.length).toBe(1);
    expect(wall.top3[0].doctorId).toBe("d-1");
  });
  it("空态→top3=0 rest=0", () => {
    const wall = buildHonorWallV13([]);
    expect(wall.top3.length).toBe(0);
  });
});

describe("selectMonthlyStarV13", () => {
  it("prevWinners=[d-1] → 跳过 d-1，选 d-2", () => {
    const star = selectMonthlyStarV13(leaderboard, ["d-1"]);
    expect(star?.doctorId).toBe("d-2");
  });
  it("prevWinners 含全部 → null", () => {
    const star = selectMonthlyStarV13(leaderboard, ["d-1", "d-2", "d-3", "d-4"]);
    expect(star).toBeNull();
  });
});

describe("computeContributionTrendV13", () => {
  it("本月45 上月40 → +5", () => {
    expect(computeContributionTrendV13(45, 40)).toBe(5);
  });
});

describe("honorWallV13Routes 读路由", () => {
  it("GET /api/v1/honor-wall 路由存在且 auth:true", () => {
    const route = honorWallV13Routes.find((r) => r.method === "GET" && r.path === "/api/v1/honor-wall");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

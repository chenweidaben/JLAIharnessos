/**
 * 健澜科技 jlmedaios - 个人学习曲线里程碑 V13 单测（M309-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  awardBadgeV13,
  buildDoctorBadgeBoardV13,
  evaluateLearningMilestoneV13,
  type DoctorMilestoneV13,
} from "../../src/bff/aggregators/learningMilestoneV13Aggregator";
import { learningMilestoneV13Routes } from "../../src/bff/routes/learningMilestoneV13";

const doctors: DoctorMilestoneV13[] = [
  { doctorId: "d1", name: "张", score: 85, badges: ["a", "b", "c"] },
  { doctorId: "d2", name: "李", score: 45, badges: ["a", "b"] },
  { doctorId: "d3", name: "王", score: 20, badges: ["a"] },
];

describe("evaluateLearningMilestoneV13", () => {
  // 算式：score=45 在 30-60 区间 → 熟练
  it("45 → 熟练", () => {
    expect(evaluateLearningMilestoneV13(45)).toBe("熟练");
  });
  // 算式：score=85 ≥ 80 → 专家
  it("85 → 专家", () => {
    expect(evaluateLearningMilestoneV13(85)).toBe("专家");
  });
  // 算式：score=15 < 30 → 入门
  it("15 → 入门", () => {
    expect(evaluateLearningMilestoneV13(15)).toBe("入门");
  });
});

describe("awardBadgeV13", () => {
  it("返回 badgeName + unlockedAt ISO", () => {
    const b = awardBadgeV13(doctors[0], "专家");
    expect(b.badgeName).toBe("专家达成");
    expect(b.unlockedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("buildDoctorBadgeBoardV13", () => {
  // 算式：d1 badges=3 > d2=2 > d3=1 → d1 → d2 → d3
  it("按徽章数降序：d1 → d2 → d3", () => {
    const board = buildDoctorBadgeBoardV13(doctors);
    expect(board[0].doctorId).toBe("d1");
    expect(board[1].doctorId).toBe("d2");
    expect(board[2].doctorId).toBe("d3");
  });
  it("空态 → []", () => {
    expect(buildDoctorBadgeBoardV13([]).length).toBe(0);
  });
});

describe("learningMilestoneV13Routes 读路由", () => {
  it("GET /api/v1/learning-milestone 路由存在且 auth:true", () => {
    const route = learningMilestoneV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/learning-milestone",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

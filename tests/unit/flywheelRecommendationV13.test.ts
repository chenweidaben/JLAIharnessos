/**
 * 健澜科技 jlmedaios - 飞轮改进建议 V13 单测（M306-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  estimateImprovementV13,
  generateFlywheelRecommendationV13,
  rankRecommendationsV13,
  type FlywheelRecommendationV13,
} from "../../src/bff/aggregators/flywheelRecommendationV13Aggregator";
import { flywheelRecommendationV13Routes } from "../../src/bff/routes/flywheelRecommendationV13";

describe("generateFlywheelRecommendationV13", () => {
  it("crossDeptDiffusionRate → 开跨科病例讨论会, +7.5", () => {
    const r = generateFlywheelRecommendationV13("crossDeptDiffusionRate");
    expect(r.action).toBe("开跨科病例讨论会");
    expect(r.expectedGain).toBe(7.5);
  });
  it("pushCtr → 优化推送时机, +6", () => {
    const r = generateFlywheelRecommendationV13("pushCtr");
    expect(r.action).toBe("优化推送时机");
    expect(r.expectedGain).toBe(6);
  });
});

describe("estimateImprovementV13", () => {
  // 算式：63.4 + 7.5 = 70.9
  it("63.4 + 7.5 = 70.9", () => {
    const r = generateFlywheelRecommendationV13("crossDeptDiffusionRate");
    expect(estimateImprovementV13(63.4, r)).toBe(70.9);
  });
});

describe("rankRecommendationsV13", () => {
  // 算式：diffusion=7.5, ctr=6, adoption=5 → 降序 diffusion → ctr → adoption
  it("按预计提升降序", () => {
    const recs: FlywheelRecommendationV13[] = [
      generateFlywheelRecommendationV13("adoptionRate"),
      generateFlywheelRecommendationV13("crossDeptDiffusionRate"),
      generateFlywheelRecommendationV13("pushCtr"),
    ];
    const ranked = rankRecommendationsV13(recs);
    expect(ranked[0].bottleneck).toBe("crossDeptDiffusionRate");
    expect(ranked[1].bottleneck).toBe("pushCtr");
    expect(ranked[2].bottleneck).toBe("adoptionRate");
  });
  it("空态 → 0", () => {
    expect(rankRecommendationsV13([]).length).toBe(0);
  });
});

describe("flywheelRecommendationV13Routes 读路由", () => {
  it("GET /api/v1/flywheel-recommendation 路由存在且 auth:true", () => {
    const route = flywheelRecommendationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/flywheel-recommendation",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

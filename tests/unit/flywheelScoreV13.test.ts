/**
 * 健澜科技 jlmedaios - 医院 AI 学习飞轮成熟度 V13 单测（M306-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFlywheelScoreV13,
  gradeFlywheelV13,
  identifyFlywheelBottleneckV13,
  type FlywheelMetricsV13,
} from "../../src/bff/aggregators/flywheelScoreV13Aggregator";
import { flywheelScoreV13Routes } from "../../src/bff/routes/flywheelScoreV13";

const metrics: FlywheelMetricsV13 = {
  qualityScore: 70,
  adoptionRate: 80,
  feedbackLoopRate: 60,
  pushCtr: 50,
  crossDeptDiffusionRate: 40,
  assetHealthScore: 59,
};

describe("computeFlywheelScoreV13", () => {
  // 算式：70×0.2 + 80×0.25 + 60×0.15 + 50×0.15 + 40×0.1 + 59×0.15
  //     = 14 + 20 + 9 + 7.5 + 4 + 8.85 = 63.35 → 63.4
  it("飞轮总分 = 63.4", () => {
    expect(computeFlywheelScoreV13(metrics)).toBe(63.4);
  });
});

describe("gradeFlywheelV13", () => {
  // 算式：60 ≤ 63.4 < 80 → 成长
  it("63.4 → 成长", () => {
    expect(gradeFlywheelV13(63.4)).toBe("成长");
  });
  // 算式：85 ≥ 80 → 优秀
  it("85 → 优秀", () => {
    expect(gradeFlywheelV13(85)).toBe("优秀");
  });
});

describe("identifyFlywheelBottleneckV13", () => {
  // 算式：weighted: quality=14, adoption=20, feedback=9, ctr=7.5, diffusion=4, asset=8.85
  // 最低 = diffusion=4 → crossDeptDiffusionRate
  it("瓶颈 = crossDeptDiffusionRate", () => {
    expect(identifyFlywheelBottleneckV13(metrics)).toBe("crossDeptDiffusionRate");
  });
});

describe("flywheelScoreV13Routes 读路由", () => {
  it("GET /api/v1/flywheel-score 路由存在且 auth:true", () => {
    const route = flywheelScoreV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/flywheel-score",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 个人学习曲线 V13 单测（M303-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildLearningCurveV13,
  computeLearningSlopeV13,
  identifyLearningPlateauV13,
  type WeeklyAdoptionV13,
} from "../../src/bff/aggregators/learningCurveV13Aggregator";
import { learningCurveV13Routes } from "../../src/bff/routes/learningCurveV13";

const weekly: WeeklyAdoptionV13[] = [
  { weekLabel: "W1", adoptionRate: 20 },
  { weekLabel: "W2", adoptionRate: 28 },
  { weekLabel: "W3", adoptionRate: 35 },
  { weekLabel: "W4", adoptionRate: 42 },
];

describe("buildLearningCurveV13", () => {
  it("4周曲线点透传", () => {
    const curve = buildLearningCurveV13(weekly);
    expect(curve.length).toBe(4);
    expect(curve[0].adoptionRate).toBe(20);
  });
  it("空态 → 0", () => {
    expect(buildLearningCurveV13([]).length).toBe(0);
  });
});

describe("computeLearningSlopeV13", () => {
  it("W4=42 - W1=20 = 22", () => {
    const curve = buildLearningCurveV13(weekly);
    expect(computeLearningSlopeV13(curve)).toBe(22);
  });
  it("单点 → 0", () => {
    expect(computeLearningSlopeV13([{ weekLabel: "W1", adoptionRate: 30 }])).toBe(0);
  });
});

describe("identifyLearningPlateauV13", () => {
  it("slope=22≥2 → 无平台期", () => {
    expect(identifyLearningPlateauV13(22)).toBe("");
  });
  it("slope=1<2 → 提示换学习材料", () => {
    expect(identifyLearningPlateauV13(1)).toContain("平台期");
  });
});

describe("learningCurveV13Routes 读路由", () => {
  it("GET /api/v1/learning-curve 路由存在且 auth:true", () => {
    const route = learningCurveV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/learning-curve",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

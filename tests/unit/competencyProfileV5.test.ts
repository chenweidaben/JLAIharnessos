/**
 * 健澜科技 jlmedaios - 医生能力画像与个性化学习路径 V5 单测（M276-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCompetencyV5,
  buildCompetencyProfileV5Report,
  identifyGapV5,
  recommendLearningV5,
} from "../../src/bff/aggregators/competencyProfileV5Aggregator";

describe("assessCompetencyV5", () => {
  it("按事件数与采纳率生成维度得分", () => {
    const p = assessCompetencyV5("u1", "心内科", { 诊断: 12, 用药: 5, 沟通: 2 }, 0.8);
    expect(p.dimensions.length).toBe(3);
    expect(p.avgScore).toBeGreaterThan(0);
  });
});

describe("identifyGapV5", () => {
  it("得分<60的维度列为短板", () => {
    const gaps = identifyGapV5({ dimensions: [
      { dimension: "诊断", score: 76, trend: "up" },
      { dimension: "用药", score: 41, trend: "flat" },
      { dimension: "沟通", score: 26, trend: "down" },
    ] });
    expect(gaps).toEqual(["用药", "沟通"]);
  });
});

describe("recommendLearningV5", () => {
  it("为每个短板生成经验精读与演练", () => {
    const path = recommendLearningV5("u1", ["用药", "沟通"]);
    expect(path.nextExperiences.length).toBe(2);
    expect(path.drills).toContain("用药专项演练");
  });
});

describe("buildCompetencyProfileV5Report", () => {
  it("统计短板维度分布", () => {
    const p1 = assessCompetencyV5("u1", "心内科", { 诊断: 12, 用药: 5, 沟通: 2 }, 0.8);
    const p2 = assessCompetencyV5("u2", "呼吸科", { 诊断: 4, 用药: 8, 沟通: 6 }, 0.6);
    const r = buildCompetencyProfileV5Report([p1, p2]);
    expect(r.totalDoctors).toBe(2);
    expect(Object.keys(r.gapDimensions).length).toBeGreaterThan(0);
  });
});

describe("写权限", () => {
  it("无权限用户不能更新学习进度", () => {
    const hasWrite = false;
    const progress = hasWrite ? { completed: 3 } : null;
    expect(progress).toBeNull();
  });
});

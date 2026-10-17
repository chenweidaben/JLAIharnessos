/**
 * 健澜科技 jlmedaios - 交接后继任者学习计划 V13 单测（M297-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildLearningPlanV13,
  estimateStudyTimeV13,
  markStudiedV13,
  type HandoverExpV13,
} from "../../src/bff/aggregators/learningPlanV13Aggregator";
import { learningPlanV13Routes } from "../../src/bff/routes/learningPlanV13";

const experiences: HandoverExpV13[] = [
  { experienceId: "e-1", title: "房颤", bucket: "fresh", transferability: 80, studied: false },
  { experienceId: "e-2", title: "术后", bucket: "stale", transferability: 50, studied: false },
  { experienceId: "e-3", title: "相互作用", bucket: "fresh", transferability: 90, studied: false },
];

describe("buildLearningPlanV13", () => {
  it("fresh优先，同bucket按transferability降序 → e-3(90) e-1(80) e-2(50)", () => {
    const plan = buildLearningPlanV13("pkg-1", experiences);
    expect(plan.items[0].experienceId).toBe("e-3");
    expect(plan.items[1].experienceId).toBe("e-1");
    expect(plan.items[2].experienceId).toBe("e-2");
    expect(plan.totalMinutes).toBe(45);
    expect(plan.studiedCount).toBe(0);
  });
  it("空态→0条0分钟", () => {
    const plan = buildLearningPlanV13("pkg-1", []);
    expect(plan.items.length).toBe(0);
    expect(plan.totalMinutes).toBe(0);
  });
});

describe("estimateStudyTimeV13", () => {
  it("3条 → 45 分钟", () => {
    expect(estimateStudyTimeV13(experiences)).toBe(45);
  });
});

describe("markStudiedV13", () => {
  it("标记 e-1 → studiedCount=1", () => {
    const plan = buildLearningPlanV13("pkg-1", experiences);
    const updated = markStudiedV13(plan, "e-1");
    expect(updated.studiedCount).toBe(1);
    expect(updated.items.find((e) => e.experienceId === "e-1")?.studied).toBe(true);
  });
});

describe("learningPlanV13Routes 写路由", () => {
  it("POST /api/v1/learning-plan/:id/studied 路由存在且 auth:true", () => {
    const route = learningPlanV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/learning-plan/:id/studied",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

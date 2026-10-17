/**
 * 健澜科技 jlmedaios - 跨科室经验扩散 V13 单测（M304-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  broadcastExperienceV13,
  findAdoptableDepartmentsV13,
  scoreDiffusionPotentialV13,
  type DeptExperienceV13,
  type DepartmentV13,
} from "../../src/bff/aggregators/crossDeptBroadcastV13Aggregator";
import { crossDeptBroadcastV13Routes } from "../../src/bff/routes/crossDeptBroadcastV13";

const experience: DeptExperienceV13 = {
  experienceId: "e-1",
  title: "房颤华法林",
  evidenceStrength: 0.9,
  generalityScore: 0.6,
  coveredDepts: ["cardio", "icu"],
};

const allDepts: DepartmentV13[] = [
  { deptId: "cardio", deptName: "心内科" },
  { deptId: "icu", deptName: "ICU" },
  { deptId: "surgery", deptName: "外科" },
  { deptId: "emergency", deptName: "急诊" },
];

describe("scoreDiffusionPotentialV13", () => {
  // 算式：0.9×100 + 0.6×50 + 2×10 = 90 + 30 + 20 = 140.0
  it("e-1: 140.0", () => {
    expect(scoreDiffusionPotentialV13(experience)).toBe(140.0);
  });
});

describe("findAdoptableDepartmentsV13", () => {
  // covered={cardio, icu} → 剔除后剩 surgery, emergency = 2 个
  it("候选科室 = [surgery, emergency]，共 2 个", () => {
    const candidates = findAdoptableDepartmentsV13(experience, allDepts);
    expect(candidates.length).toBe(2);
    expect(candidates[0].deptId).toBe("surgery");
  });
  it("空态 → 0", () => {
    expect(findAdoptableDepartmentsV13(experience, []).length).toBe(0);
  });
});

describe("broadcastExperienceV13", () => {
  // 2 个候选 → 2 条通知
  it("生成 2 条广播通知", () => {
    const candidates = findAdoptableDepartmentsV13(experience, allDepts);
    const notices = broadcastExperienceV13(experience, candidates);
    expect(notices.length).toBe(2);
    expect(notices[0].targetDept).toBe("surgery");
  });
});

describe("crossDeptBroadcastV13Routes 读路由", () => {
  it("GET /api/v1/cross-dept-broadcast 路由存在且 auth:true", () => {
    const route = crossDeptBroadcastV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/cross-dept-broadcast",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

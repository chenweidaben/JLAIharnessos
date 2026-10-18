/**
 * 健澜科技 jlmedaios - 教学质量管理 V13 单测（M434-A，-quality 后缀避让旧版 trainingMgmtDetailV13（M419））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeTeachingPlanCompletionRateV13,
  computeTeachingStudentSatisfactionRateV13,
  computeTeachingTeacherPassRateV13,
  type TeachingQualityMgmtRecordV13,
} from "../../src/bff/aggregators/teachingQualityMgmtV13Aggregator";
import { teachingQualityMgmtV13Routes } from "../../src/bff/routes/teachingQualityMgmtV13";

const records: TeachingQualityMgmtRecordV13[] = [
  { completedPlans: 950, totalPlans: 1000, qualifiedTeachers: 980, totalTeachers: 1000, satisfiedStudents: 920, surveyedStudents: 1000 },
  { completedPlans: 950, totalPlans: 1000, qualifiedTeachers: 980, totalTeachers: 1000, satisfiedStudents: 920, surveyedStudents: 1000 },
];

describe("computeTeachingPlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("教学计划完成率 = 95.00%", () => {
    expect(computeTeachingPlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeTeachingPlanCompletionRateV13([])).toBe(0);
  });
});

describe("computeTeachingTeacherPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("带教老师合格率 = 98.00%", () => {
    expect(computeTeachingTeacherPassRateV13(records)).toBe(98.00);
  });
});

describe("computeTeachingStudentSatisfactionRateV13", () => {
  // 算式：(920+920)/(1000+1000)×100 = 1840/2000×100 = 92.00
  it("学生满意度 = 92.00%", () => {
    expect(computeTeachingStudentSatisfactionRateV13(records)).toBe(92.00);
  });
});

describe("teachingQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/teaching-quality-mgmt 路由存在且 auth:true", () => {
    const route = teachingQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/teaching-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

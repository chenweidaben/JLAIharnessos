/**
 * 健澜科技 jlmedaios - 教学管理 V13 单测（M361-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeStudentSatisfactionV13,
  computeTeacherQualificationPassRateV13,
  computeTeachingHoursCompletionRateV13,
  type TeachingMgmtRecordV13,
} from "../../src/bff/aggregators/teachingMgmtV13Aggregator";
import { teachingMgmtV13Routes } from "../../src/bff/routes/teachingMgmtV13";

const records: TeachingMgmtRecordV13[] = [
  { completedHours: 950, plannedHours: 1000, qualifiedTeachers: 48, teacherCount: 50, studentSatisfaction: 95 },
  { completedHours: 950, plannedHours: 1000, qualifiedTeachers: 47, teacherCount: 50, studentSatisfaction: 97 },
];

describe("computeTeachingHoursCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("教学课时完成率 = 95.00%", () => {
    expect(computeTeachingHoursCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeTeachingHoursCompletionRateV13([])).toBe(0);
  });
});

describe("computeTeacherQualificationPassRateV13", () => {
  // 算式：(48+47)/(50+50) = 95/100×100 = 95.00
  it("带教老师资质合格率 = 95.00%", () => {
    expect(computeTeacherQualificationPassRateV13(records)).toBe(95.00);
  });
});

describe("computeStudentSatisfactionV13", () => {
  // 算式：(95+97)/2 = 96.00
  it("学员满意度 = 96.00", () => {
    expect(computeStudentSatisfactionV13(records)).toBe(96.00);
  });
});

describe("teachingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/teaching-mgmt 路由存在且 auth:true", () => {
    const route = teachingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/teaching-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

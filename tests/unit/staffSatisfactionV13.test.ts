/**
 * 健澜科技 jlmedaios - 员工满意度 V13 单测（M322-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStaffSatisfactionOverviewV13,
  computeGroupSatisfactionV13,
  computeTurnoverIntentionRateV13,
  type StaffSurveyV13,
} from "../../src/bff/aggregators/staffSatisfactionV13Aggregator";
import { staffSatisfactionV13Routes } from "../../src/bff/routes/staffSatisfactionV13";

const surveys: StaffSurveyV13[] = [
  { surveyId: "s1", group: "doctor", satisfaction: 4, intendsToLeave: false },
  { surveyId: "s2", group: "doctor", satisfaction: 5, intendsToLeave: true },
  { surveyId: "s3", group: "doctor", satisfaction: 3, intendsToLeave: false },
  { surveyId: "s4", group: "nurse", satisfaction: 3, intendsToLeave: false },
  { surveyId: "s5", group: "nurse", satisfaction: 4, intendsToLeave: true },
  { surveyId: "s6", group: "nurse", satisfaction: 4, intendsToLeave: false },
  { surveyId: "s7", group: "admin", satisfaction: 4, intendsToLeave: false },
  { surveyId: "s8", group: "admin", satisfaction: 5, intendsToLeave: false },
  { surveyId: "s9", group: "doctor", satisfaction: 4, intendsToLeave: false },
  { surveyId: "s10", group: "nurse", satisfaction: 3, intendsToLeave: false },
];

describe("computeGroupSatisfactionV13", () => {
  // 算式：doctor = (4+5+3+4)/4 = 16/4 = 4
  it("doctor mean = 4", () => {
    expect(computeGroupSatisfactionV13(surveys, "doctor")).toBe(4);
  });
  // 算式：nurse = (3+4+4+3)/4 = 14/4 = 3.5 → round = 4
  it("nurse mean = 4", () => {
    expect(computeGroupSatisfactionV13(surveys, "nurse")).toBe(4);
  });
  // 算式：admin = (4+5)/2 = 4.5 → round = 5
  it("admin mean = 5", () => {
    expect(computeGroupSatisfactionV13(surveys, "admin")).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computeGroupSatisfactionV13([], "doctor")).toBe(0);
  });
});

describe("computeTurnoverIntentionRateV13", () => {
  // 算式：intendsToLeave=true = s2+s5 = 2 → 2/10×100 = 20
  it("turnoverIntentionRate = 20%", () => {
    expect(computeTurnoverIntentionRateV13(surveys)).toBe(20);
  });
});

describe("buildStaffSatisfactionOverviewV13", () => {
  it("总览汇总正确", () => {
    const overview = buildStaffSatisfactionOverviewV13(surveys);
    expect(overview.groupSatisfaction.doctor).toBe(4);
    expect(overview.turnoverIntentionRate).toBe(20);
  });
});

describe("staffSatisfactionV13Routes 读路由", () => {
  it("GET /api/v1/staff-satisfaction 路由存在且 auth:true", () => {
    const route = staffSatisfactionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-satisfaction",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

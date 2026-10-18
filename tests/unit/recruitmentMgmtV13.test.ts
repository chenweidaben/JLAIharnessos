/**
 * 健澜科技 jlmedaios - 人员招聘与配置 V13 单测（M444-C，绩效薪酬与人力资源管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRecruitmentPlanCompletionRateV13,
  computeRecruitmentPositionMatchingRateV13,
  computeRecruitmentRetention3MonthsRateV13,
  type RecruitmentMgmtRecordV13,
} from "../../src/bff/aggregators/recruitmentMgmtV13Aggregator";
import { recruitmentMgmtV13Routes } from "../../src/bff/routes/recruitmentMgmtV13";

const records: RecruitmentMgmtRecordV13[] = [
  { recruited: 950, plan: 1000, matched: 900, onboarded: 1000, retained3Months: 980 },
  { recruited: 950, plan: 1000, matched: 900, onboarded: 1000, retained3Months: 980 },
];

describe("computeRecruitmentPlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("招聘计划完成率 = 95.00%", () => {
    expect(computeRecruitmentPlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeRecruitmentPlanCompletionRateV13([])).toBe(0);
  });
});

describe("computeRecruitmentPositionMatchingRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("岗位匹配度 = 90.00%", () => {
    expect(computeRecruitmentPositionMatchingRateV13(records)).toBe(90.00);
  });
});

describe("computeRecruitmentRetention3MonthsRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("入职 3 个月留存率 = 98.00%", () => {
    expect(computeRecruitmentRetention3MonthsRateV13(records)).toBe(98.00);
  });
});

describe("recruitmentMgmtV13Routes 读路由", () => {
  it("GET /api/v1/recruitment-mgmt 路由存在且 auth:true", () => {
    const route = recruitmentMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/recruitment-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 患者体验统计 V13 单测（M386-A，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeComplaintResolutionHoursV13,
  computeComplimentLetterCountV13,
  computeSatisfactionScoreV13,
  type PatientExperienceRecordV13,
} from "../../src/bff/aggregators/patientExperienceStatsV13Aggregator";
import { patientExperienceStatsV13Routes } from "../../src/bff/routes/patientExperienceStatsV13";

const records: PatientExperienceRecordV13[] = [
  { totalScore: 4500, surveyCount: 1000, totalHours: 240, complaintCount: 120, complimentCount: 10 },
  { totalScore: 4500, surveyCount: 1000, totalHours: 240, complaintCount: 120, complimentCount: 10 },
];

describe("computeSatisfactionScoreV13", () => {
  // 算式：(4500+4500)/(1000+1000) = 9000/2000 = 4.50
  it("满意度评分 = 4.50 分", () => {
    expect(computeSatisfactionScoreV13(records)).toBe(4.50);
  });
  it("空态 → 0", () => {
    expect(computeSatisfactionScoreV13([])).toBe(0);
  });
});

describe("computeComplaintResolutionHoursV13", () => {
  // 算式：(240+240)/(120+120) = 480/240 = 2.00
  it("投诉处理时长 = 2.00 小时", () => {
    expect(computeComplaintResolutionHoursV13(records)).toBe(2.00);
  });
});

describe("computeComplimentLetterCountV13", () => {
  // 算式：10+10 = 20
  it("表扬信数 = 20 封", () => {
    expect(computeComplimentLetterCountV13(records)).toBe(20);
  });
});

describe("patientExperienceStatsV13Routes 读路由", () => {
  it("GET /api/v1/patient-experience-stats 路由存在且 auth:true", () => {
    const route = patientExperienceStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-experience-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

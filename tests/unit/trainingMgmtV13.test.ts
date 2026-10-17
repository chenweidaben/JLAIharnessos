/**
 * 健澜科技 jlmedaios - 培训管理 V13 单测（M362-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnnualTrainingHoursV13,
  computePreJobTrainingCompletionRateV13,
  computeTrainingExamPassRateV13,
  type TrainingMgmtRecordV13,
} from "../../src/bff/aggregators/trainingMgmtV13Aggregator";
import { trainingMgmtV13Routes } from "../../src/bff/routes/trainingMgmtV13";

const records: TrainingMgmtRecordV13[] = [
  { completedPreJob: 950, requiredPreJob: 1000, annualHours: 40, examPassed: 480, examAttended: 500 },
  { completedPreJob: 950, requiredPreJob: 1000, annualHours: 40, examPassed: 470, examAttended: 500 },
];

describe("computePreJobTrainingCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("岗前培训完成率 = 95.00%", () => {
    expect(computePreJobTrainingCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePreJobTrainingCompletionRateV13([])).toBe(0);
  });
});

describe("computeAnnualTrainingHoursV13", () => {
  // 算式：40+40 = 80
  it("年度培训学时 = 80", () => {
    expect(computeAnnualTrainingHoursV13(records)).toBe(80);
  });
});

describe("computeTrainingExamPassRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("培训考核合格率 = 95.00%", () => {
    expect(computeTrainingExamPassRateV13(records)).toBe(95.00);
  });
});

describe("trainingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/training-mgmt 路由存在且 auth:true", () => {
    const route = trainingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/training-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

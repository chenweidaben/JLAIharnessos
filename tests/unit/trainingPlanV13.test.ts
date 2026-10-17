/**
 * 健澜科技 jlmedaios - 培训计划 V13 单测（M384-D，M384 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnnualTrainingPlanCountV13,
  computePerCapitaTrainingHoursV13,
  computeTrainingCompletionRateV13,
  type TrainingPlanRecordV13,
} from "../../src/bff/aggregators/trainingPlanV13Aggregator";
import { trainingPlanV13Routes } from "../../src/bff/routes/trainingPlanV13";

const records: TrainingPlanRecordV13[] = [
  { planCount: 20, completedCount: 950, plannedCount: 1000, totalHours: 10000, totalPeople: 500 },
  { planCount: 20, completedCount: 950, plannedCount: 1000, totalHours: 10000, totalPeople: 500 },
];

describe("computeAnnualTrainingPlanCountV13", () => {
  // 算式：20+20 = 40
  it("年度培训计划数 = 40 项", () => {
    expect(computeAnnualTrainingPlanCountV13(records)).toBe(40);
  });
  it("空态 → 0", () => {
    expect(computeAnnualTrainingPlanCountV13([])).toBe(0);
  });
});

describe("computeTrainingCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("培训完成率 = 95.00%", () => {
    expect(computeTrainingCompletionRateV13(records)).toBe(95.00);
  });
});

describe("computePerCapitaTrainingHoursV13", () => {
  // 算式：(10000+10000)/(500+500) = 20000/1000 = 20.00
  it("人均培训学时 = 20.00 学时", () => {
    expect(computePerCapitaTrainingHoursV13(records)).toBe(20.00);
  });
});

describe("trainingPlanV13Routes 读路由", () => {
  it("GET /api/v1/training-plan 路由存在且 auth:true", () => {
    const route = trainingPlanV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/training-plan",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

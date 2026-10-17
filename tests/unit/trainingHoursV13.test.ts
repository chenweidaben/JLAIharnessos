/**
 * 健澜科技 jlmedaios - 培训时长 V13 单测（M330-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgTrainingHoursV13,
  computeNewHireTrainingRateV13,
  type TrainingRecordV13,
} from "../../src/bff/aggregators/trainingHoursV13Aggregator";
import { trainingHoursV13Routes } from "../../src/bff/routes/trainingHoursV13";

const records: TrainingRecordV13[] = [
  { trainingHours: 10, isNewHire: true, completedOnboarding: true },
  { trainingHours: 20, isNewHire: true, completedOnboarding: true },
  { trainingHours: 30, isNewHire: true, completedOnboarding: true },
  { trainingHours: 15, isNewHire: true, completedOnboarding: true },
  { trainingHours: 25, isNewHire: true, completedOnboarding: false },
  { trainingHours: 40, isNewHire: false, completedOnboarding: false },
  { trainingHours: 35, isNewHire: false, completedOnboarding: false },
  { trainingHours: 25, isNewHire: false, completedOnboarding: false },
];

describe("computeAvgTrainingHoursV13", () => {
  // 算式：(10+20+30+15+25+40+35+20)/8 = 25
  it("人均学时 = 25", () => {
    expect(computeAvgTrainingHoursV13(records)).toBe(25);
  });
  it("空态 → 0", () => {
    expect(computeAvgTrainingHoursV13([])).toBe(0);
  });
});

describe("computeNewHireTrainingRateV13", () => {
  // 算式：4/5×100 = 80
  it("新员工完成率 = 80%", () => {
    expect(computeNewHireTrainingRateV13(records)).toBe(80);
  });
  it("空态完成率 → 0", () => {
    expect(computeNewHireTrainingRateV13([])).toBe(0);
  });
});

describe("trainingHoursV13Routes 读路由", () => {
  it("GET /api/v1/training-hours 路由存在且 auth:true", () => {
    const route = trainingHoursV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/training-hours",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

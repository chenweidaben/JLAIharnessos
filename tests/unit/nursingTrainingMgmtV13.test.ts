/**
 * 健澜科技 jlmedaios - 护理培训管理 V13 单测（M453-C，护理管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNursingSpecialistTrainingCoverageRateV13,
  computeNursingThreeBaseExamQualifiedRateV13,
  computeNursingTrainingPlanCompletionRateV13,
  type NursingTrainingMgmtRecordV13,
} from "../../src/bff/aggregators/nursingTrainingMgmtV13Aggregator";
import { nursingTrainingMgmtV13Routes } from "../../src/bff/routes/nursingTrainingMgmtV13";

const records: NursingTrainingMgmtRecordV13[] = [
  { completed: 950, planned: 1000, qualified: 900, totalExam: 1000, trained: 980, totalShouldTrain: 1000 },
  { completed: 950, planned: 1000, qualified: 900, totalExam: 1000, trained: 980, totalShouldTrain: 1000 },
];

describe("computeNursingTrainingPlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("护理培训计划完成率 = 95.00%", () => {
    expect(computeNursingTrainingPlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNursingTrainingPlanCompletionRateV13([])).toBe(0);
  });
});

describe("computeNursingThreeBaseExamQualifiedRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("三基考核合格率 = 90.00%", () => {
    expect(computeNursingThreeBaseExamQualifiedRateV13(records)).toBe(90.00);
  });
});

describe("computeNursingSpecialistTrainingCoverageRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("专科护士培训覆盖率 = 98.00%", () => {
    expect(computeNursingSpecialistTrainingCoverageRateV13(records)).toBe(98.00);
  });
});

describe("nursingTrainingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/nursing-training-mgmt 路由存在且 auth:true", () => {
    const route = nursingTrainingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-training-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

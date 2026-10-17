/**
 * 健澜科技 jlmedaios - 培训管理（细节）V13 单测（M419-C，detail 避让旧版 talentTeamMgmtV13/academicLevelV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeContinuingEducationCreditComplianceRateV13,
  computeEmergencySkillTrainingPassRateV13,
  computeThreeBasicExamPassRateV13,
  type TrainingMgmtDetailRecordV13,
} from "../../src/bff/aggregators/trainingMgmtDetailV13Aggregator";
import { trainingMgmtDetailV13Routes } from "../../src/bff/routes/trainingMgmtDetailV13";

const records: TrainingMgmtDetailRecordV13[] = [
  { threeBasicPassed: 950, threeBasicTook: 1000, ceCreditMet: 980, ceCreditShould: 1000, emergencyPassed: 990, emergencyTrained: 1000 },
  { threeBasicPassed: 950, threeBasicTook: 1000, ceCreditMet: 980, ceCreditShould: 1000, emergencyPassed: 990, emergencyTrained: 1000 },
];

describe("computeThreeBasicExamPassRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("三基考核合格率 = 95.00%", () => {
    expect(computeThreeBasicExamPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeThreeBasicExamPassRateV13([])).toBe(0);
  });
});

describe("computeContinuingEducationCreditComplianceRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("继续教育学分达标率 = 98.00%", () => {
    expect(computeContinuingEducationCreditComplianceRateV13(records)).toBe(98.00);
  });
});

describe("computeEmergencySkillTrainingPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("急救技能培训合格率 = 99.00%", () => {
    expect(computeEmergencySkillTrainingPassRateV13(records)).toBe(99.00);
  });
});

describe("trainingMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/training-mgmt-detail 路由存在且 auth:true", () => {
    const route = trainingMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/training-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 继续教育质量管理 V13 单测（M434-C，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeContinuingEducationCompletionRateV13,
  computeContinuingEducationCreditPassRateV13,
  computeContinuingEducationTrainingCoverageRateV13,
  type ContinuingEducationQualityMgmtRecordV13,
} from "../../src/bff/aggregators/continuingEducationQualityMgmtV13Aggregator";
import { continuingEducationQualityMgmtV13Routes } from "../../src/bff/routes/continuingEducationQualityMgmtV13";

const records: ContinuingEducationQualityMgmtRecordV13[] = [
  { completedCredits: 950, shouldCompleteCredits: 1000, qualifiedStaff: 980, shouldQualifiedStaff: 1000, trainedStaff: 900, totalStaff: 1000 },
  { completedCredits: 950, shouldCompleteCredits: 1000, qualifiedStaff: 980, shouldQualifiedStaff: 1000, trainedStaff: 900, totalStaff: 1000 },
];

describe("computeContinuingEducationCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("继教完成率 = 95.00%", () => {
    expect(computeContinuingEducationCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeContinuingEducationCompletionRateV13([])).toBe(0);
  });
});

describe("computeContinuingEducationCreditPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("学分达标率 = 98.00%", () => {
    expect(computeContinuingEducationCreditPassRateV13(records)).toBe(98.00);
  });
});

describe("computeContinuingEducationTrainingCoverageRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("培训覆盖率 = 90.00%", () => {
    expect(computeContinuingEducationTrainingCoverageRateV13(records)).toBe(90.00);
  });
});

describe("continuingEducationQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/continuing-education-quality-mgmt 路由存在且 auth:true", () => {
    const route = continuingEducationQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/continuing-education-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

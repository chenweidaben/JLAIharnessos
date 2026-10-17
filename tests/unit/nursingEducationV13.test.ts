/**
 * 健澜科技 jlmedaios - 护理教育 V13 单测（M389-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNurseTrainingCompletionRateV13,
  computeNursingExamPassRateV13,
  computeNursingRoundCountV13,
  type NursingEducationRecordV13,
} from "../../src/bff/aggregators/nursingEducationV13Aggregator";
import { nursingEducationV13Routes } from "../../src/bff/routes/nursingEducationV13";

const records: NursingEducationRecordV13[] = [
  { completedCount: 950, shouldTrainCount: 1000, roundCount: 100, passedCount: 900, examCount: 1000 },
  { completedCount: 950, shouldTrainCount: 1000, roundCount: 100, passedCount: 900, examCount: 1000 },
];

describe("computeNurseTrainingCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("护士培训完成率 = 95.00%", () => {
    expect(computeNurseTrainingCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNurseTrainingCompletionRateV13([])).toBe(0);
  });
});

describe("computeNursingRoundCountV13", () => {
  // 算式：100+100 = 200
  it("护理查房次数 = 200 次", () => {
    expect(computeNursingRoundCountV13(records)).toBe(200);
  });
});

describe("computeNursingExamPassRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("护理考核合格率 = 90.00%", () => {
    expect(computeNursingExamPassRateV13(records)).toBe(90.00);
  });
});

describe("nursingEducationV13Routes 读路由", () => {
  it("GET /api/v1/nursing-education 路由存在且 auth:true", () => {
    const route = nursingEducationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-education",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

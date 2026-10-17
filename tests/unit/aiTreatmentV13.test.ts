/**
 * 健澜科技 jlmedaios - AI 辅助治疗 V13 单测（M366-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAiEfficacyPredictAccuracyV13,
  computeAiMedicationAdviceAdoptionRateV13,
  computeAiTreatmentPlanRecommendRateV13,
  type AiTreatmentRecordV13,
} from "../../src/bff/aggregators/aiTreatmentV13Aggregator";
import { aiTreatmentV13Routes } from "../../src/bff/routes/aiTreatmentV13";

const records: AiTreatmentRecordV13[] = [
  { treatmentPlanCount: 1000, aiRecommended: 800, aiEfficacyPredictAccurate: 760, aiMedicationAdopted: 600 },
  { treatmentPlanCount: 1000, aiRecommended: 800, aiEfficacyPredictAccurate: 760, aiMedicationAdopted: 600 },
];

describe("computeAiTreatmentPlanRecommendRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("AI 方案推荐率 = 80.00%", () => {
    expect(computeAiTreatmentPlanRecommendRateV13(records)).toBe(80.00);
  });
  it("空态 → 0", () => {
    expect(computeAiTreatmentPlanRecommendRateV13([])).toBe(0);
  });
});

describe("computeAiEfficacyPredictAccuracyV13", () => {
  // 算式：(760+760)/(800+800) = 1520/1600×100 = 95.00
  it("AI 疗效预测准确率 = 95.00%", () => {
    expect(computeAiEfficacyPredictAccuracyV13(records)).toBe(95.00);
  });
});

describe("computeAiMedicationAdviceAdoptionRateV13", () => {
  // 算式：(600+600)/(800+800) = 1200/1600×100 = 75.00
  it("AI 用药建议采纳率 = 75.00%", () => {
    expect(computeAiMedicationAdviceAdoptionRateV13(records)).toBe(75.00);
  });
});

describe("aiTreatmentV13Routes 读路由", () => {
  it("GET /api/v1/ai-treatment 路由存在且 auth:true", () => {
    const route = aiTreatmentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ai-treatment",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

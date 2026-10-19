/**
 * 健澜科技 jlmedaios - 病历AI营养风险筛查 V14 单测（M564-A）
 *
 * 测试 buildAiNutritionRiskScreen 构建 AI 营养风险筛查、screenNutritionRiskByAi AI 营养风险筛查、buildAiNutritionRiskScreenReport 构建营养风险筛查报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiNutritionRiskScreen,
  buildAiNutritionRiskScreenReport,
  screenNutritionRiskByAi,
  type AiNutritionRiskScreenInputV14,
} from "../../src/bff/aggregators/emrAiNutritionRiskScreenV14Aggregator";
import { emrAiNutritionRiskScreenV14Routes } from "../../src/bff/routes/emrAiNutritionRiskScreenV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiNutritionRiskScreen 构建 AI 营养风险筛查", () => {
  // 手算：recordId='RECB078', dept='营养科' → 正确构建
  it("recordId='RECB078', dept='营养科' → 正确构建", () => {
    const base = buildAiNutritionRiskScreen("RECB078", "营养科");
    expect(base.recordId).toBe("RECB078");
    expect(base.dept).toBe("营养科");
  });
});

describe("screenNutritionRiskByAi 高风险", () => {
  // 手算：{bmi=17.0, weightLoss=8, intakeReduced=60}
  // 手算：riskScore = (17.0<18.5?2:0) + (8>5?2:0) + (60>50?2:0) = 2+2+2 = 6
  // 手算：riskLevel = 6>=4 → '高风险'
  it("{bmi=17.0, weightLoss=8, intakeReduced=60} → riskScore=6, riskLevel='高风险'", () => {
    const input: AiNutritionRiskScreenInputV14 = { bmi: 17.0, weightLoss: 8, intakeReduced: 60 };
    const result = screenNutritionRiskByAi(input);
    expect(result.riskScore).toBe(6);
    expect(result.riskLevel).toBe("高风险");
  });
});

describe("screenNutritionRiskByAi 低风险", () => {
  // 手算：{bmi=22.0, weightLoss=0, intakeReduced=0}
  // 手算：riskScore = (22.0<18.5?0:0) + (0>5?0:0) + (0>50?0:0) = 0+0+0 = 0
  // 手算：riskLevel = 0>=2?... : '低风险' = '低风险'
  it("{bmi=22.0, weightLoss=0, intakeReduced=0} → riskScore=0, riskLevel='低风险'", () => {
    const input: AiNutritionRiskScreenInputV14 = { bmi: 22.0, weightLoss: 0, intakeReduced: 0 };
    const result = screenNutritionRiskByAi(input);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("低风险");
  });
});

describe("buildAiNutritionRiskScreenReport 构建营养风险筛查报告", () => {
  // 手算：{riskScore=6, riskLevel='高风险'}
  // 手算：透传 riskScore + riskLevel
  it("{riskScore=6, riskLevel='高风险'} → 正确返回（透传）", () => {
    const report = buildAiNutritionRiskScreenReport({ riskScore: 6, riskLevel: "高风险" });
    expect(report.riskScore).toBe(6);
    expect(report.riskLevel).toBe("高风险");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-nutrition-risk-screen auth:true", () => {
    const def = (emrAiNutritionRiskScreenV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-nutrition-risk-screen");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

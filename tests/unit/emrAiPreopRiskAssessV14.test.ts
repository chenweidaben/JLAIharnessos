/**
 * 健澜科技 jlmedaios - 病历AI术前风险评估 V14 单测（M562-A，手术与麻醉管理系列）
 *
 * 测试 buildAiPreopRiskAssess 构建 AI 术前风险评估、assessPreopRiskByAi AI 术前风险评估、buildAiPreopRiskAssessReport 构建术前风险评估报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPreopRiskAssess,
  buildAiPreopRiskAssessReport,
  assessPreopRiskByAi,
  type AiPreopRiskAssessInputV14,
} from "../../src/bff/aggregators/emrAiPreopRiskAssessV14Aggregator";
import { emrAiPreopRiskAssessV14Routes } from "../../src/bff/routes/emrAiPreopRiskAssessV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPreopRiskAssess 构建 AI 术前风险评估", () => {
  // 手算：recordId='RECB070', dept='外科' → 正确构建
  it("recordId='RECB070', dept='外科' → 正确构建", () => {
    const base = buildAiPreopRiskAssess("RECB070", "外科");
    expect(base.recordId).toBe("RECB070");
    expect(base.dept).toBe("外科");
  });
});

describe("assessPreopRiskByAi 高风险", () => {
  // 手算：{patientAge=75, hasHeartDisease=true, hasHypertension=true}
  // 手算：riskScore = (75>=70?25:0) + 30 + 15 = 25+30+15 = 70
  // 手算：riskLevel = 70>=50 → '高风险'
  it("{patientAge=75, hasHeartDisease=true, hasHypertension=true} → riskScore=70, riskLevel='高风险'", () => {
    const input: AiPreopRiskAssessInputV14 = { patientAge: 75, hasHeartDisease: true, hasHypertension: true };
    const result = assessPreopRiskByAi(input);
    expect(result.riskScore).toBe(70);
    expect(result.riskLevel).toBe("高风险");
  });
});

describe("assessPreopRiskByAi 低风险", () => {
  // 手算：{patientAge=45, hasHeartDisease=false, hasHypertension=false}
  // 手算：riskScore = 0 + 0 + 0 = 0
  // 手算：riskLevel = 0>=25?... : '低风险' = '低风险'
  it("{patientAge=45, hasHeartDisease=false, hasHypertension=false} → riskScore=0, riskLevel='低风险'", () => {
    const input: AiPreopRiskAssessInputV14 = { patientAge: 45, hasHeartDisease: false, hasHypertension: false };
    const result = assessPreopRiskByAi(input);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("低风险");
  });
});

describe("buildAiPreopRiskAssessReport 构建术前风险评估报告", () => {
  // 手算：{riskScore=70, riskLevel='高风险'}
  // 手算：透传 riskScore + riskLevel
  it("{riskScore=70, riskLevel='高风险'} → 正确返回（透传）", () => {
    const report = buildAiPreopRiskAssessReport({ riskScore: 70, riskLevel: "高风险" });
    expect(report.riskScore).toBe(70);
    expect(report.riskLevel).toBe("高风险");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-preop-risk-assess auth:true", () => {
    const def = (emrAiPreopRiskAssessV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-preop-risk-assess");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

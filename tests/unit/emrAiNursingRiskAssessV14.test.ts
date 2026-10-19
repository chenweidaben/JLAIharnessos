/**
 * 健澜科技 jlmedaios - 病历AI护理风险评估 V14 单测（M557-C）
 *
 * 测试 buildAiNursingRiskAssess 构建 AI 护理风险评估、assessNursingRiskByAi AI 护理风险评估、buildAiNursingRiskAssessReport 构建护理风险评估报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiNursingRiskAssess,
  buildAiNursingRiskAssessReport,
  assessNursingRiskByAi,
  type AiNursingRiskAssessInputV14,
} from "../../src/bff/aggregators/emrAiNursingRiskAssessV14Aggregator";
import { emrAiNursingRiskAssessV14Routes } from "../../src/bff/routes/emrAiNursingRiskAssessV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiNursingRiskAssess 构建 AI 护理风险评估", () => {
  // 手算：recordId='RECB051', dept='护理部' → 正确构建
  it("recordId='RECB051', dept='护理部' → 正确构建", () => {
    const base = buildAiNursingRiskAssess("RECB051", "护理部");
    expect(base.recordId).toBe("RECB051");
    expect(base.dept).toBe("护理部");
  });
});

describe("assessNursingRiskByAi 高风险", () => {
  // 手算：{age=75, hasFallHistory=true, hasPressureUlcer=true, isConfused=false}
  // 手算：riskScore = (75>=70?20:0) + 30 + 25 + 0 = 20+30+25+0 = 75
  // 手算：riskLevel = 75 >= 60 ? '高风险' = '高风险'
  it("{age=75, hasFallHistory=true, hasPressureUlcer=true, isConfused=false} → riskScore=75, riskLevel='高风险'", () => {
    const input: AiNursingRiskAssessInputV14 = { age: 75, hasFallHistory: true, hasPressureUlcer: true, isConfused: false };
    const result = assessNursingRiskByAi(input);
    expect(result.riskScore).toBe(75);
    expect(result.riskLevel).toBe("高风险");
  });
});

describe("assessNursingRiskByAi 低风险", () => {
  // 手算：{age=40, hasFallHistory=false, hasPressureUlcer=false, isConfused=false}
  // 手算：riskScore = 0 + 0 + 0 + 0 = 0
  // 手算：riskLevel = 0 >= 30 ? ... : '低风险' = '低风险'
  it("{age=40, hasFallHistory=false, hasPressureUlcer=false, isConfused=false} → riskScore=0, riskLevel='低风险'", () => {
    const input: AiNursingRiskAssessInputV14 = { age: 40, hasFallHistory: false, hasPressureUlcer: false, isConfused: false };
    const result = assessNursingRiskByAi(input);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("低风险");
  });
});

describe("buildAiNursingRiskAssessReport 构建护理风险评估报告", () => {
  // 手算：{riskLevel='高风险', riskScore=75}
  // 手算：透传 riskLevel + riskScore
  it("{riskLevel='高风险', riskScore=75} → 正确返回（透传）", () => {
    const report = buildAiNursingRiskAssessReport({ riskLevel: "高风险", riskScore: 75 });
    expect(report.riskLevel).toBe("高风险");
    expect(report.riskScore).toBe(75);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-nursing-risk-assess auth:true", () => {
    const def = (emrAiNursingRiskAssessV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-nursing-risk-assess");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

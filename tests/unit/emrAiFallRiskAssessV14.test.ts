/**
 * 健澜科技 jlmedaios - 病历AI患者跌倒风险评估 V14 单测（M559-D，M559 收官）
 *
 * 测试 buildAiFallRiskAssess 构建 AI 患者跌倒风险评估、assessFallRiskByAi AI 患者跌倒风险评估、buildAiFallRiskAssessReport 构建跌倒风险评估报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiFallRiskAssess,
  buildAiFallRiskAssessReport,
  assessFallRiskByAi,
  type AiFallRiskAssessInputV14,
} from "../../src/bff/aggregators/emrAiFallRiskAssessV14Aggregator";
import { emrAiFallRiskAssessV14Routes } from "../../src/bff/routes/emrAiFallRiskAssessV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiFallRiskAssess 构建 AI 患者跌倒风险评估", () => {
  // 手算：recordId='RECB061', dept='护理部' → 正确构建
  it("recordId='RECB061', dept='护理部' → 正确构建", () => {
    const base = buildAiFallRiskAssess("RECB061", "护理部");
    expect(base.recordId).toBe("RECB061");
    expect(base.dept).toBe("护理部");
  });
});

describe("assessFallRiskByAi 高风险", () => {
  // 手算：{age=75, hasDizziness=true, hasGaitInstability=true, sedativeUse=false}
  // 手算：riskScore = (75>=70?30:0) + 25 + 25 + 0 = 30+25+25+0 = 80
  // 手算：riskLevel = 80>=60 = '高跌倒风险'
  it("{age=75, hasDizziness=true, hasGaitInstability=true, sedativeUse=false} → riskScore=80, riskLevel='高跌倒风险'", () => {
    const input: AiFallRiskAssessInputV14 = { age: 75, hasDizziness: true, hasGaitInstability: true, sedativeUse: false };
    const result = assessFallRiskByAi(input);
    expect(result.riskScore).toBe(80);
    expect(result.riskLevel).toBe("高跌倒风险");
  });
});

describe("assessFallRiskByAi 低风险", () => {
  // 手算：{age=40, hasDizziness=false, hasGaitInstability=false, sedativeUse=false}
  // 手算：riskScore = 0+0+0+0 = 0
  // 手算：riskLevel = 0>=30?... : '低跌倒风险' = '低跌倒风险'
  it("{age=40, hasDizziness=false, hasGaitInstability=false, sedativeUse=false} → riskScore=0, riskLevel='低跌倒风险'", () => {
    const input: AiFallRiskAssessInputV14 = { age: 40, hasDizziness: false, hasGaitInstability: false, sedativeUse: false };
    const result = assessFallRiskByAi(input);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("低跌倒风险");
  });
});

describe("buildAiFallRiskAssessReport 构建跌倒风险评估报告", () => {
  // 手算：{riskScore=80, riskLevel='高跌倒风险'}
  // 手算：透传 riskScore + riskLevel
  it("{riskScore=80, riskLevel='高跌倒风险'} → 正确返回（透传）", () => {
    const report = buildAiFallRiskAssessReport({ riskScore: 80, riskLevel: "高跌倒风险" });
    expect(report.riskScore).toBe(80);
    expect(report.riskLevel).toBe("高跌倒风险");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-fall-risk-assess auth:true", () => {
    const def = (emrAiFallRiskAssessV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-fall-risk-assess");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

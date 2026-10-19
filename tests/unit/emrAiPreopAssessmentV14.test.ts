/**
 * 健澜科技 jlmedaios - 病历AI术前评估 V14 单测（M555-A）
 *
 * 测试 buildAiPreopAssessment 构建 AI 术前评估、assessPreopByAi AI 术前评估、buildAiPreopAssessmentReport 构建术前评估报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPreopAssessment,
  buildAiPreopAssessmentReport,
  assessPreopByAi,
  type AiPreopAssessmentInputV14,
} from "../../src/bff/aggregators/emrAiPreopAssessmentV14Aggregator";
import { emrAiPreopAssessmentV14Routes } from "../../src/bff/routes/emrAiPreopAssessmentV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPreopAssessment 构建 AI 术前评估", () => {
  // 手算：recordId='RECB041', dept='外科' → 正确构建
  it("recordId='RECB041', dept='外科' → 正确构建", () => {
    const base = buildAiPreopAssessment("RECB041", "外科");
    expect(base.recordId).toBe("RECB041");
    expect(base.dept).toBe("外科");
  });
});

describe("assessPreopByAi 低危", () => {
  // 手算：{patientAge=45, hasHeartDisease=false, hasDiabetes=false}
  // 手算：(45>=70 || false)=false → riskLevel='低危'
  // 手算：canOperate = '低危' !== '高危' = true
  it("{patientAge=45, hasHeartDisease=false, hasDiabetes=false} → riskLevel='低危', canOperate=true", () => {
    const input: AiPreopAssessmentInputV14 = { patientAge: 45, hasHeartDisease: false, hasDiabetes: false };
    const result = assessPreopByAi(input);
    expect(result.riskLevel).toBe("低危");
    expect(result.canOperate).toBe(true);
  });
});

describe("assessPreopByAi 高危", () => {
  // 手算：{patientAge=75, hasHeartDisease=true, hasDiabetes=true}
  // 手算：(75>=70 || true)=true, hasDiabetes=true → riskLevel='高危'
  // 手算：canOperate = '高危' !== '高危' = false
  it("{patientAge=75, hasHeartDisease=true, hasDiabetes=true} → riskLevel='高危', canOperate=false", () => {
    const input: AiPreopAssessmentInputV14 = { patientAge: 75, hasHeartDisease: true, hasDiabetes: true };
    const result = assessPreopByAi(input);
    expect(result.riskLevel).toBe("高危");
    expect(result.canOperate).toBe(false);
  });
});

describe("buildAiPreopAssessmentReport 构建术前评估报告", () => {
  // 手算：{riskLevel='低危', canOperate=true}
  // 手算：透传 riskLevel + canOperate
  it("{riskLevel='低危', canOperate=true} → 正确返回（透传）", () => {
    const report = buildAiPreopAssessmentReport({ riskLevel: "低危", canOperate: true });
    expect(report.riskLevel).toBe("低危");
    expect(report.canOperate).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-preop-assessment auth:true", () => {
    const def = (emrAiPreopAssessmentV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-preop-assessment");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 病历AI术前评估智能推荐 V14 单测（M562-A）
 *
 * 测试 buildAiPreopAssessReco 构建 AI 术前评估智能推荐、recommendPreopAssessByAi AI 术前评估智能推荐、buildAiPreopAssessRecoReport 构建术前评估智能推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPreopAssessReco,
  buildAiPreopAssessRecoReport,
  recommendPreopAssessByAi,
  type AiPreopAssessRecoInputV14,
} from "../../src/bff/aggregators/emrAiPreopAssessRecoV14Aggregator";
import { emrAiPreopAssessRecoV14Routes } from "../../src/bff/routes/emrAiPreopAssessRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPreopAssessReco 构建 AI 术前评估智能推荐", () => {
  // 手算：recordId='RECB070', dept='外科' → 正确构建
  it("recordId='RECB070', dept='外科' → 正确构建", () => {
    const base = buildAiPreopAssessReco("RECB070", "外科");
    expect(base.recordId).toBe("RECB070");
    expect(base.dept).toBe("外科");
  });
});

describe("recommendPreopAssessByAi 高风险", () => {
  // 手算：{patientAge=75, hasHeartDisease=true, hasDiabetes=true}
  // 手算：recommendItems = 75>=70 → ['心电图','心脏彩超','肺功能']
  // 手算：riskLevel = (75>=70 && true)=true → '高风险'
  it("{patientAge=75, hasHeartDisease=true, hasDiabetes=true} → recommendItems 含心电图/心脏彩超/肺功能, riskLevel='高风险'", () => {
    const input: AiPreopAssessRecoInputV14 = { patientAge: 75, hasHeartDisease: true, hasDiabetes: true };
    const result = recommendPreopAssessByAi(input);
    expect(result.recommendItems).toContain("心电图");
    expect(result.recommendItems).toContain("心脏彩超");
    expect(result.recommendItems).toContain("肺功能");
    expect(result.riskLevel).toBe("高风险");
  });
});

describe("recommendPreopAssessByAi 低风险", () => {
  // 手算：{patientAge=45, hasHeartDisease=false, hasDiabetes=false}
  // 手算：recommendItems = 45>=70=false, hasHeartDisease=false → ['血常规','凝血功能']
  // 手算：riskLevel = (45>=70 && false)=false；(45>=70 || false)=false → '低风险'
  it("{patientAge=45, hasHeartDisease=false, hasDiabetes=false} → recommendItems 含血常规/凝血功能, riskLevel='低风险'", () => {
    const input: AiPreopAssessRecoInputV14 = { patientAge: 45, hasHeartDisease: false, hasDiabetes: false };
    const result = recommendPreopAssessByAi(input);
    expect(result.recommendItems).toContain("血常规");
    expect(result.recommendItems).toContain("凝血功能");
    expect(result.riskLevel).toBe("低风险");
  });
});

describe("buildAiPreopAssessRecoReport 构建术前评估智能推荐报告", () => {
  // 手算：{recommendItems=['心电图'], riskLevel='高风险'}
  // 手算：透传 recommendItems + riskLevel
  it("{recommendItems=['心电图'], riskLevel='高风险'} → 正确返回（透传）", () => {
    const report = buildAiPreopAssessRecoReport({ recommendItems: ["心电图"], riskLevel: "高风险" });
    expect(report.recommendItems).toEqual(["心电图"]);
    expect(report.riskLevel).toBe("高风险");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-preop-assess-reco auth:true", () => {
    const def = (emrAiPreopAssessRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-preop-assess-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

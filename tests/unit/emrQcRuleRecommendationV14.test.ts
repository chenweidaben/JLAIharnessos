/**
 * 健澜科技 jlmedaios - 质控规则智能推荐 V14 单测（M520-A）
 *
 * 测试 buildRuleRecommendation 构建推荐、recommendRules 推荐规则、buildRuleRecommendationReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRuleRecommendation,
  buildRuleRecommendationReport,
  recommendRules,
  type RecommendationContextV14,
} from "../../src/bff/aggregators/emrQcRuleRecommendationV14Aggregator";
import { emrQcRuleRecommendationV14Routes } from "../../src/bff/routes/emrQcRuleRecommendationV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRuleRecommendation 构建推荐", () => {
  // 手算：dept='心内科', recordType='入院记录' → 正确构建
  it("dept='心内科', recordType='入院记录' → 正确构建", () => {
    const recommendation = buildRuleRecommendation("心内科", "入院记录");
    expect(recommendation.dept).toBe("心内科");
    expect(recommendation.recordType).toBe("入院记录");
  });
});

describe("recommendRules 单匹配", () => {
  // 手算：context={dept:'心内科', recordType:'入院记录'}
  // 手算：candidateRules=['入院记录完整性','病程记录及时性','手术记录规范']
  // 手算：仅'入院记录完整性'包含'入院记录'子串 → recommended=['入院记录完整性'], count=1
  it("context={dept:'心内科',recordType:'入院记录'}, candidateRules=['入院记录完整性','病程记录及时性','手术记录规范'] → recommended=['入院记录完整性'], count=1", () => {
    const context: RecommendationContextV14 = { dept: "心内科", recordType: "入院记录" };
    const candidateRules: string[] = ["入院记录完整性", "病程记录及时性", "手术记录规范"];
    const result = recommendRules(context, candidateRules);
    expect(result.recommended).toEqual(["入院记录完整性"]);
    expect(result.count).toBe(1);
  });
});

describe("recommendRules 多匹配", () => {
  // 手算：context={dept:'普外科', recordType:'手术'}
  // 手算：candidateRules=['手术记录规范','手术分级授权','入院记录完整性']
  // 手算：'手术记录规范'和'手术分级授权'包含'手术'子串 → recommended 包含两项, count=2
  it("context={dept:'普外科',recordType:'手术'}, candidateRules=['手术记录规范','手术分级授权','入院记录完整性'] → recommended 包含'手术记录规范'和'手术分级授权', count=2", () => {
    const context: RecommendationContextV14 = { dept: "普外科", recordType: "手术" };
    const candidateRules: string[] = ["手术记录规范", "手术分级授权", "入院记录完整性"];
    const result = recommendRules(context, candidateRules);
    expect(result.recommended).toContain("手术记录规范");
    expect(result.recommended).toContain("手术分级授权");
    expect(result.count).toBe(2);
  });
});

describe("buildRuleRecommendationReport 构建报告", () => {
  // 手算：{recommended=['手术记录规范','手术分级授权'], count=2} → topRule=第一项='手术记录规范'
  it("{recommended=['手术记录规范','手术分级授权'], count=2} → topRule='手术记录规范'", () => {
    const report = buildRuleRecommendationReport({ recommended: ["手术记录规范", "手术分级授权"], count: 2 });
    expect(report.topRule).toBe("手术记录规范");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-rule-recommendation auth:true", () => {
    const def = (emrQcRuleRecommendationV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-rule-recommendation");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

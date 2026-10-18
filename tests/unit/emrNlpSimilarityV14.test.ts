/**
 * 健澜科技 jlmedaios - NLP 病历相似度计算 V14 单测（M491-D，M491 收官）
 *
 * 测试 calculateMedicalSimilarity 计算、buildSimilarityReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  calculateMedicalSimilarity,
  buildSimilarityReport,
  type NlpSimilarityResultV14,
} from "../../src/bff/aggregators/emrNlpSimilarityV14Aggregator";
import { emrNlpSimilarityV14Routes } from "../../src/bff/routes/emrNlpSimilarityV14";
import type { RouteDef } from "../../src/bff/types";

describe("calculateMedicalSimilarity 有相似", () => {
  // 手算：textA='糖尿病高血压', textB='糖尿病' → similarityScore > 0
  it("textA='糖尿病高血压', textB='糖尿病' → similarityScore > 0", () => {
    const result = calculateMedicalSimilarity("糖尿病高血压", "糖尿病");
    expect(result.similarityScore).toBeGreaterThan(0);
  });
});

describe("calculateMedicalSimilarity 无相似", () => {
  // 手算：textA='感冒', textB='骨折' → similarityScore = 0
  it("textA='感冒', textB='骨折' → similarityScore = 0", () => {
    const result = calculateMedicalSimilarity("感冒", "骨折");
    expect(result.similarityScore).toBe(0);
  });
});

describe("buildSimilarityReport 85分", () => {
  // 手算：similarityScore=85 → similarityScore=85
  it("similarityScore=85 → similarityScore=85", () => {
    const result: NlpSimilarityResultV14 = { similarityScore: 85 };
    const report = buildSimilarityReport(result);
    expect(report.similarityScore).toBe(85);
  });
});

describe("buildSimilarityReport 0分", () => {
  // 手算：similarityScore=0 → similarityScore=0
  it("similarityScore=0 → similarityScore=0", () => {
    const result: NlpSimilarityResultV14 = { similarityScore: 0 };
    const report = buildSimilarityReport(result);
    expect(report.similarityScore).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-nlp-similarity auth:true", () => {
    const def = (emrNlpSimilarityV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-nlp-similarity");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

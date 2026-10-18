/**
 * 健澜科技 jlmedaios - 质控评分改进建议 V14 单测（M492-D，M492 收官）
 *
 * 测试 generateScoreSuggestion 生成、buildSuggestionReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  generateScoreSuggestion,
  buildSuggestionReport,
  type ScoreSuggestionV14,
} from "../../src/bff/aggregators/emrQcScoreSuggestionV14Aggregator";
import { emrQcScoreSuggestionV14Routes } from "../../src/bff/routes/emrQcScoreSuggestionV14";
import type { RouteDef } from "../../src/bff/types";

describe("generateScoreSuggestion 差", () => {
  // 手算分级：score=50 <60 → level='差'
  it("score=50 → level='差'", () => {
    const suggestion = generateScoreSuggestion(50);
    expect(suggestion.level).toBe("差");
  });
});

describe("generateScoreSuggestion 优", () => {
  // 手算分级：score=95 >=90 → level='优'
  it("score=95 → level='优'", () => {
    const suggestion = generateScoreSuggestion(95);
    expect(suggestion.level).toBe("优");
  });
});

describe("buildSuggestionReport 差", () => {
  // 手算：level='差' → suggestions 非空
  it("level='差' → suggestions 非空", () => {
    const suggestion: ScoreSuggestionV14 = generateScoreSuggestion(50);
    const report = buildSuggestionReport(suggestion);
    expect(report.level).toBe("差");
    expect(report.suggestions.length).toBeGreaterThan(0);
  });
});

describe("buildSuggestionReport 优", () => {
  // 手算：level='优' → suggestions 非空
  it("level='优' → suggestions 非空", () => {
    const suggestion: ScoreSuggestionV14 = generateScoreSuggestion(95);
    const report = buildSuggestionReport(suggestion);
    expect(report.level).toBe("优");
    expect(report.suggestions.length).toBeGreaterThan(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-score-suggestion auth:true", () => {
    const def = (emrQcScoreSuggestionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-score-suggestion");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

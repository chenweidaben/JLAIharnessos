/**
 * 健澜科技 jlmedaios - 质控知识置信度评估 V14 单测（M489-D，M489 收官）
 *
 * 测试 buildConfidenceScore 构建、aggregateConfidence 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildConfidenceScore,
  aggregateConfidence,
  type ConfidenceScoreV14,
} from "../../src/bff/aggregators/emrQcConfidenceV14Aggregator";
import { emrQcConfidenceV14Routes } from "../../src/bff/routes/emrQcConfidenceV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildConfidenceScore 糖尿病", () => {
  // 手算：ruleName='糖尿病诊断规则', score=95 → 正确构建
  it("ruleName='糖尿病诊断规则', score=95 → 正确构建", () => {
    const score: ConfidenceScoreV14 = buildConfidenceScore("糖尿病诊断规则", 95);
    expect(score.ruleName).toBe("糖尿病诊断规则");
    expect(score.score).toBe(95);
  });
});

describe("aggregateConfidence 3个规则", () => {
  // 手算：3 个规则得分 90/85/95 → count=3, avgScore=90.0 (270/3=90), maxScore=95
  it("3 个规则得分 90/85/95 → count=3, avgScore=90.0, maxScore=95", () => {
    const scores = [
      { ruleName: "规则A", score: 90 },
      { ruleName: "规则B", score: 85 },
      { ruleName: "规则C", score: 95 },
    ];
    const result = aggregateConfidence(scores);
    expect(result.count).toBe(3);
    expect(result.avgScore).toBe(90.0);
    expect(result.maxScore).toBe(95);
  });
});

describe("aggregateConfidence 空数组", () => {
  // 手算：空数组 → count=0, avgScore=0
  it("空数组 → count=0, avgScore=0", () => {
    const scores: { ruleName: string; score: number }[] = [];
    const result = aggregateConfidence(scores);
    expect(result.count).toBe(0);
    expect(result.avgScore).toBe(0);
  });
});

describe("buildConfidenceScore 高血压", () => {
  // 手算：ruleName='高血压用药规则', score=88 → 正确构建
  it("ruleName='高血压用药规则', score=88 → 正确构建", () => {
    const score: ConfidenceScoreV14 = buildConfidenceScore("高血压用药规则", 88);
    expect(score.ruleName).toBe("高血压用药规则");
    expect(score.score).toBe(88);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-confidence auth:true", () => {
    const def = (emrQcConfidenceV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-confidence");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

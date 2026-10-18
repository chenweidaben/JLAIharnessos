/**
 * 健澜科技 jlmedaios - 病历AI质控风险评分 V14 单测（M549-C）
 *
 * 测试 buildAiQcRiskScore 构建 AI 风险评分、scoreQcRiskByAi AI 风险评分、buildAiQcRiskScoreReport 构建风险评分报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQcRiskScore,
  buildAiQcRiskScoreReport,
  scoreQcRiskByAi,
  type AiQcRiskScoreInputV14,
} from "../../src/bff/aggregators/emrAiQcRiskScoreV14Aggregator";
import { emrAiQcRiskScoreV14Routes } from "../../src/bff/routes/emrAiQcRiskScoreV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQcRiskScore 构建 AI 风险评分", () => {
  // 手算：recordId='RECB019', dept='内科' → 正确构建
  it("recordId='RECB019', dept='内科' → 正确构建", () => {
    const base = buildAiQcRiskScore("RECB019", "内科");
    expect(base.recordId).toBe("RECB019");
    expect(base.dept).toBe("内科");
  });
});

describe("scoreQcRiskByAi 高风险", () => {
  // 手算：{blockCount=2, majorCount=3, minorCount=5}
  // 手算：riskScore = Math.min(100, 2*15+3*8+5*3) = Math.min(100, 30+24+15) = Math.min(100, 69) = 69
  // 手算：riskScore=69 → 69>=60 → riskLevel='高风险'
  it("{blockCount=2, majorCount=3, minorCount=5} → riskScore=69, riskLevel='高风险'", () => {
    const input: AiQcRiskScoreInputV14 = { blockCount: 2, majorCount: 3, minorCount: 5 };
    const result = scoreQcRiskByAi(input);
    expect(result.riskScore).toBe(69);
    expect(result.riskLevel).toBe("高风险");
  });
});

describe("scoreQcRiskByAi 低风险", () => {
  // 手算：{blockCount=0, majorCount=0, minorCount=2}
  // 手算：riskScore = Math.min(100, 0+0+2*3) = Math.min(100, 6) = 6
  // 手算：riskScore=6 → 6<30 → riskLevel='低风险'
  it("{blockCount=0, majorCount=0, minorCount=2} → riskScore=6, riskLevel='低风险'", () => {
    const input: AiQcRiskScoreInputV14 = { blockCount: 0, majorCount: 0, minorCount: 2 };
    const result = scoreQcRiskByAi(input);
    expect(result.riskScore).toBe(6);
    expect(result.riskLevel).toBe("低风险");
  });
});

describe("buildAiQcRiskScoreReport 构建风险评分报告", () => {
  // 手算：{riskScore=69, riskLevel='高风险'}
  // 手算：透传 riskScore + riskLevel
  it("{riskScore=69, riskLevel='高风险'} → 正确返回（透传）", () => {
    const report = buildAiQcRiskScoreReport({ riskScore: 69, riskLevel: "高风险" });
    expect(report.riskScore).toBe(69);
    expect(report.riskLevel).toBe("高风险");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-qc-risk-score auth:true", () => {
    const def = (emrAiQcRiskScoreV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-qc-risk-score");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - AI 病历风险预测 V14 单测（M486-C）
 *
 * 测试 predictAiRisk 预测、buildRiskReport 报告、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  predictAiRisk,
  buildRiskReport,
  type AiRiskResultV14,
} from "../../src/bff/aggregators/emrAiRiskPredictV14Aggregator";
import { emrAiRiskPredictV14Routes } from "../../src/bff/routes/emrAiRiskPredictV14";
import type { RouteDef } from "../../src/bff/types";

describe("predictAiRisk 年轻单症", () => {
  // 手算：age=30, diseases=[], symptoms=['头痛'] → riskLevel='低'
  it("age=30, diseases=[], symptoms=['头痛'] → riskLevel='低'", () => {
    const result: AiRiskResultV14 = predictAiRisk({ age: 30, diseases: [], symptoms: ["头痛"] });
    expect(result.riskLevel).toBe("低");
  });
});

describe("predictAiRisk 老年多病胸痛", () => {
  // 手算：age=70, diseases=['糖尿病','高血压'], symptoms=['胸痛'] → riskLevel='高'
  it("age=70, diseases=['糖尿病','高血压'], symptoms=['胸痛'] → riskLevel='高'", () => {
    const result: AiRiskResultV14 = predictAiRisk({ age: 70, diseases: ["糖尿病", "高血压"], symptoms: ["胸痛"] });
    expect(result.riskLevel).toBe("高");
  });
});

describe("buildRiskReport 高风险", () => {
  // 手算：riskLevel='高' → riskScore=80
  it("riskLevel='高' → riskScore=80", () => {
    const result: AiRiskResultV14 = { age: 70, diseases: [], symptoms: [], riskLevel: "高" };
    const report = buildRiskReport(result);
    expect(report.riskScore).toBe(80);
  });
});

describe("buildRiskReport 低风险", () => {
  // 手算：riskLevel='低' → riskScore=20
  it("riskLevel='低' → riskScore=20", () => {
    const result: AiRiskResultV14 = { age: 30, diseases: [], symptoms: [], riskLevel: "低" };
    const report = buildRiskReport(result);
    expect(report.riskScore).toBe(20);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-ai-risk-predict auth:true", () => {
    const def = (emrAiRiskPredictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-ai-risk-predict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 病历AI临床问答 V14 单测（M545-A）
 *
 * 测试 buildAiClinicalQa 构建 AI 临床问答、askClinicalQa 临床问答、buildAiClinicalQaReport 构建问答报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiClinicalQa,
  buildAiClinicalQaReport,
  askClinicalQa,
  type AiClinicalQaInputV14,
} from "../../src/bff/aggregators/emrAiClinicalQaV14Aggregator";
import { emrAiClinicalQaV14Routes } from "../../src/bff/routes/emrAiClinicalQaV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiClinicalQa 构建 AI 临床问答", () => {
  // 手算：recordId='RECB001', dept='心内科' → 正确构建
  it("recordId='RECB001', dept='心内科' → 正确构建", () => {
    const base = buildAiClinicalQa("RECB001", "心内科");
    expect(base.recordId).toBe("RECB001");
    expect(base.dept).toBe("心内科");
  });
});

describe("askClinicalQa 胸痛", () => {
  // 手算：{question='患者胸痛如何处理'}
  // 手算：question.includes('胸痛') → true → answer='建议完善心电图和心肌酶谱检查'
  // 手算：confidence = 0.88
  it("{question='患者胸痛如何处理'} → answer='建议完善心电图和心肌酶谱检查', confidence=0.88", () => {
    const input: AiClinicalQaInputV14 = { question: "患者胸痛如何处理" };
    const result = askClinicalQa(input);
    expect(result.answer).toBe("建议完善心电图和心肌酶谱检查");
    expect(result.confidence).toBe(0.88);
  });
});

describe("askClinicalQa 一般", () => {
  // 手算：{question='患者发热如何处理'}
  // 手算：question.includes('胸痛') → false → answer='建议结合临床进一步评估'
  // 手算：confidence = 0.88
  it("{question='患者发热如何处理'} → answer='建议结合临床进一步评估', confidence=0.88", () => {
    const input: AiClinicalQaInputV14 = { question: "患者发热如何处理" };
    const result = askClinicalQa(input);
    expect(result.answer).toBe("建议结合临床进一步评估");
    expect(result.confidence).toBe(0.88);
  });
});

describe("buildAiClinicalQaReport 构建问答报告", () => {
  // 手算：{answer='建议完善心电图和心肌酶谱检查', confidence=0.88}
  // 手算：透传 answer + confidence
  it("{answer='建议完善心电图和心肌酶谱检查', confidence=0.88} → 正确返回（透传）", () => {
    const report = buildAiClinicalQaReport({ answer: "建议完善心电图和心肌酶谱检查", confidence: 0.88 });
    expect(report.answer).toBe("建议完善心电图和心肌酶谱检查");
    expect(report.confidence).toBe(0.88);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-clinical-qa auth:true", () => {
    const def = (emrAiClinicalQaV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-clinical-qa");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

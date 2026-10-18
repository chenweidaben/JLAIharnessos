/**
 * 健澜科技 jlmedaios - 病历AI生成建议 V14 单测（M543-A）
 *
 * 测试 buildAiSuggestion 构建 AI 建议、generateAiSuggestion AI 生成建议、buildAiSuggestionReport 构建建议报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiSuggestion,
  buildAiSuggestionReport,
  generateAiSuggestion,
  type AiSuggestionInputV14,
} from "../../src/bff/aggregators/emrAiSuggestionV14Aggregator";
import { emrAiSuggestionV14Routes } from "../../src/bff/routes/emrAiSuggestionV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiSuggestion 构建 AI 建议", () => {
  // 手算：recordId='REC900', dept='心内科' → 正确构建
  it("recordId='REC900', dept='心内科' → 正确构建", () => {
    const base = buildAiSuggestion("REC900", "心内科");
    expect(base.recordId).toBe("REC900");
    expect(base.dept).toBe("心内科");
  });
});

describe("generateAiSuggestion 胸痛", () => {
  // 手算：{recordType='入院记录', symptom='胸痛3天'}
  // 手算：recordType==='入院记录' && symptom.includes('胸痛') → true → suggestion='建议补充心梗相关检查记录'
  // 手算：confidence = 0.85
  it("{recordType='入院记录', symptom='胸痛3天'} → suggestion='建议补充心梗相关检查记录', confidence=0.85", () => {
    const input: AiSuggestionInputV14 = { recordType: "入院记录", symptom: "胸痛3天" };
    const result = generateAiSuggestion(input);
    expect(result.suggestion).toBe("建议补充心梗相关检查记录");
    expect(result.confidence).toBe(0.85);
  });
});

describe("generateAiSuggestion 一般", () => {
  // 手算：{recordType='门诊病历', symptom='咳嗽'}
  // 手算：recordType==='入院记录'? → false → suggestion='建议完善主诉描述'
  // 手算：confidence = 0.85
  it("{recordType='门诊病历', symptom='咳嗽'} → suggestion='建议完善主诉描述', confidence=0.85", () => {
    const input: AiSuggestionInputV14 = { recordType: "门诊病历", symptom: "咳嗽" };
    const result = generateAiSuggestion(input);
    expect(result.suggestion).toBe("建议完善主诉描述");
    expect(result.confidence).toBe(0.85);
  });
});

describe("buildAiSuggestionReport 构建建议报告", () => {
  // 手算：{suggestion='建议补充心梗相关检查记录', confidence=0.85}
  // 手算：透传 suggestion + confidence
  it("{suggestion='建议补充心梗相关检查记录', confidence=0.85} → 正确返回（透传）", () => {
    const report = buildAiSuggestionReport({ suggestion: "建议补充心梗相关检查记录", confidence: 0.85 });
    expect(report.suggestion).toBe("建议补充心梗相关检查记录");
    expect(report.confidence).toBe(0.85);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-suggestion auth:true", () => {
    const def = (emrAiSuggestionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-suggestion");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

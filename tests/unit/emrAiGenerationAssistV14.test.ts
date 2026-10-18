/**
 * 健澜科技 jlmedaios - AI病历生成辅助 V14 单测（M522-A）
 *
 * 测试 buildAiGenerationAssist 构建生成、generateMedicalRecordDraft 生成草稿、buildAiGenerationReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiGenerationAssist,
  buildAiGenerationReport,
  generateMedicalRecordDraft,
  type AiGenerationContextV14,
} from "../../src/bff/aggregators/emrAiGenerationAssistV14Aggregator";
import { emrAiGenerationAssistV14Routes } from "../../src/bff/routes/emrAiGenerationAssistV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiGenerationAssist 构建生成", () => {
  // 手算：recordType='入院记录', dept='心内科' → 正确构建
  it("recordType='入院记录', dept='心内科' → 正确构建", () => {
    const assist = buildAiGenerationAssist("入院记录", "心内科");
    expect(assist.recordType).toBe("入院记录");
    expect(assist.dept).toBe("心内科");
  });
});

describe("generateMedicalRecordDraft 生成草稿", () => {
  // 手算：symptoms=['胸痛','胸闷','气促']
  // 手算：symptoms.join('')='胸痛胸闷气促' → JS UTF-16 length=6（6个汉字）
  // 手算：draftLength = 6 × 10 = 60
  // 手算：fieldCount = 3 + 3 = 6
  // 手算：confidence = 0.85 固定
  it("context={recordType:'入院记录',dept:'心内科',symptoms=['胸痛','胸闷','气促']} → draftLength=60, fieldCount=6, confidence=0.85", () => {
    const context: AiGenerationContextV14 = {
      recordType: "入院记录",
      dept: "心内科",
      symptoms: ["胸痛", "胸闷", "气促"],
    };
    const result = generateMedicalRecordDraft(context);
    expect(result.draftLength).toBe(60);
    expect(result.fieldCount).toBe(6);
    expect(result.confidence).toBe(0.85);
  });
});

describe("buildAiGenerationReport 构建报告", () => {
  // 手算：confidence=0.85 >= 0.8 → '高质量草稿'
  it("{draftLength:60, confidence:0.85} → quality='高质量草稿'", () => {
    const report = buildAiGenerationReport({ draftLength: 60, confidence: 0.85 });
    expect(report.draftLength).toBe(60);
    expect(report.confidence).toBe(0.85);
    expect(report.quality).toBe("高质量草稿");
  });
});

describe("generateMedicalRecordDraft 空症状", () => {
  // 手算：symptoms=[] → join('')='' → length=0
  // 手算：draftLength = 0 × 10 = 0
  // 手算：fieldCount = 0 + 3 = 3
  it("context={...symptoms=[]} → draftLength=0, fieldCount=3", () => {
    const context: AiGenerationContextV14 = {
      recordType: "入院记录",
      dept: "心内科",
      symptoms: [],
    };
    const result = generateMedicalRecordDraft(context);
    expect(result.draftLength).toBe(0);
    expect(result.fieldCount).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-generation-assist auth:true", () => {
    const def = (emrAiGenerationAssistV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-generation-assist");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

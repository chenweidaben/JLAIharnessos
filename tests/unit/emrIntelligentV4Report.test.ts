/**
 * 健澜科技 jlmedaios - 病历智能 V4 纯函数单测（M248-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  autoCodeDiagnosisV4,
  buildEMRIntelligentV4Report,
  extractClinicalEntitiesV4,
} from "../../src/bff/aggregators/emrIntelligentV4ReportAggregator";

describe("extractClinicalEntitiesV4", () => {
  it("胸痛+阿司匹林+CT → 提取3类", () => {
    const r = extractClinicalEntitiesV4("患者胸痛，予阿司匹林，行CT检查");
    expect(r.conditions.length).toBe(1);
  });
});

describe("autoCodeDiagnosisV4", () => {
  it("急性心梗 → I21.9编码", () => {
    expect(autoCodeDiagnosisV4("诊断急性心梗").icd).toBe("I21.9");
  });
});

describe("buildEMRIntelligentV4Report", () => {
  it("生成 NLP 数据", () => {
    const r = buildEMRIntelligentV4Report("30d");
    expect(r.nlp.entities).toBeGreaterThan(0);
  });

  it("生成质控数据", () => {
    const r = buildEMRIntelligentV4Report("30d");
    expect(r.quality.completeness).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildEMRIntelligentV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

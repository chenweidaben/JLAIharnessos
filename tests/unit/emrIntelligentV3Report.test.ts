/**
 * 健澜科技 jlmedaios - 病历智能 V3 纯函数单测（M238-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  autoCodeDiagnosis,
  buildEMRIntelligentV3Report,
  extractClinicalEntities,
} from "../../src/bff/aggregators/emrIntelligentV3ReportAggregator";

describe("extractClinicalEntities", () => {
  it("发热+肺炎+阿莫西林 → 三类实体", () => {
    const e = extractClinicalEntities("患者发热，诊断肺炎，予阿莫西林");
    expect(e.symptoms.length).toBe(1);
    expect(e.diseases.length).toBe(1);
    expect(e.medications.length).toBe(1);
  });
});

describe("autoCodeDiagnosis", () => {
  it("肺炎文本 → J18.9", () => {
    expect(autoCodeDiagnosis("社区获得性肺炎").icd10).toBe("J18.9");
  });
});

describe("buildEMRIntelligentV3Report", () => {
  it("生成NLP数据", () => {
    const r = buildEMRIntelligentV3Report("30d");
    expect(r.nlp.entities).toBeGreaterThan(0);
  });

  it("生成质控数据", () => {
    const r = buildEMRIntelligentV3Report("30d");
    expect(r.qc.gradeA).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildEMRIntelligentV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - AI 辅助诊断 V3 纯函数单测（M255-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAdoptionRateV3,
  buildAIDiagnosisV3Report,
  differentialDiagnosisAIV3,
} from "../../src/bff/aggregators/aiDiagnosisV3ReportAggregator";

describe("differentialDiagnosisAIV3", () => {
  it("发热咳嗽+高血压糖尿病 → 概率40+20=60", () => {
    expect(differentialDiagnosisAIV3(["发热", "咳嗽"], { chronic: ["高血压", "糖尿病"] }).probability).toBe(60);
  });
});

describe("assessAdoptionRateV3", () => {
  it("建议100采纳75 → 75%达标", () => {
    expect(assessAdoptionRateV3(100, 75).adequate).toBe(true);
  });
});

describe("buildAIDiagnosisV3Report", () => {
  it("生成诊断数据", () => {
    const r = buildAIDiagnosisV3Report("30d");
    expect(r.diagnosis.suggestions).toBeGreaterThan(0);
  });

  it("生成质量数据", () => {
    const r = buildAIDiagnosisV3Report("30d");
    expect(r.quality.accuracy).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildAIDiagnosisV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

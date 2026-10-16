/**
 * 健澜科技 jlmedaios - 神经与精神心理疾病 V5 纯函数单测（M265-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCognitionV5,
  buildNeuroPsychV5Report,
  screenDepressionV5,
} from "../../src/bff/aggregators/neuroPsychV5ReportAggregator";

describe("assessCognitionV5", () => {
  it("MMSE 22+MoCA 24 → 轻度认知障碍", () => {
    expect(assessCognitionV5({ score: 22 }, { score: 24 }).diagnosis).toBe("轻度认知障碍");
  });
});

describe("screenDepressionV5", () => {
  it("PHQ-9 22 → 重度抑郁危机干预", () => {
    expect(screenDepressionV5({ score: 22 }).risk).toBe("高危");
  });
});

describe("buildNeuroPsychV5Report", () => {
  it("生成脑血管数据", () => {
    const r = buildNeuroPsychV5Report("30d");
    expect(r.cerebrovascular.tia).toBeGreaterThan(0);
  });

  it("生成认知数据", () => {
    const r = buildNeuroPsychV5Report("30d");
    expect(r.cognitive.mmse).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildNeuroPsychV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

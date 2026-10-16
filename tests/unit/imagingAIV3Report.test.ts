/**
 * 健澜科技 jlmedaios - 影像 AI V3 纯函数单测（M238-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAIImagingAccuracy,
  buildImagingAIV3Report,
  detectLungNodule,
} from "../../src/bff/aggregators/imagingAIV3ReportAggregator";

describe("detectLungNodule", () => {
  it("含结节影像 → 检出8mm", () => {
    expect(detectLungNodule("CT肺结节").nodule).toBe(true);
  });
});

describe("assessAIImagingAccuracy", () => {
  it("AI 950 / 医师 1000 → 95%", () => {
    expect(assessAIImagingAccuracy(950, 1000).sensitivity).toBe(95);
  });
});

describe("buildImagingAIV3Report", () => {
  it("生成肺结节数据", () => {
    const r = buildImagingAIV3Report("30d");
    expect(r.lung.nodules).toBeGreaterThan(0);
  });

  it("生成多模态数据", () => {
    const r = buildImagingAIV3Report("30d");
    expect(r.multimodal.ct).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildImagingAIV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 影像 AI V4 纯函数单测（M248-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAIImagingAccuracyV4,
  buildImagingAIV4Report,
  detectLungNoduleV4,
} from "../../src/bff/aggregators/imagingAIV4ReportAggregator";

describe("detectLungNoduleV4", () => {
  it("LDCT有100结节 → 15恶性", () => {
    expect(detectLungNoduleV4({ ldct: true, nodules: 100 }).malignant).toBe(15);
  });
});

describe("assessAIImagingAccuracyV4", () => {
  it("AI85放射90 → 可比较", () => {
    expect(assessAIImagingAccuracyV4({ sensitivity: 85, specificity: 85 }, { sensitivity: 90, specificity: 90 }).comparable).toBe(true);
  });
});

describe("buildImagingAIV4Report", () => {
  it("生成肺结节数据", () => {
    const r = buildImagingAIV4Report("30d");
    expect(r.lung.nodules).toBeGreaterThan(0);
  });

  it("生成病理数据", () => {
    const r = buildImagingAIV4Report("30d");
    expect(r.pathology.cancer).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildImagingAIV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

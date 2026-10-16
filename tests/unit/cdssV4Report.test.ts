/**
 * 健澜科技 jlmedaios - CDSS V4 纯函数单测（M248-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCDSSAdoptionV4,
  buildCDSSV4Report,
  differentialDiagnosisV4,
} from "../../src/bff/aggregators/cdssV4ReportAggregator";

describe("differentialDiagnosisV4", () => {
  it("有症状 → 常见病排第一", () => {
    expect(differentialDiagnosisV4(["胸痛"], []).top).toBe("常见病");
  });
});

describe("assessCDSSAdoptionV4", () => {
  it("推荐100采纳75 → 75%采纳率", () => {
    expect(assessCDSSAdoptionV4(100, 75).adoptionRate).toBe(75);
  });
});

describe("buildCDSSV4Report", () => {
  it("生成鉴别数据", () => {
    const r = buildCDSSV4Report("30d");
    expect(r.differential.cases).toBeGreaterThan(0);
  });

  it("生成质量数据", () => {
    const r = buildCDSSV4Report("30d");
    expect(r.quality.adoption).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCDSSV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

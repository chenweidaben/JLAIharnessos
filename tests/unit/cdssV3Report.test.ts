/**
 * 健澜科技 jlmedaios - CDSS V3 纯函数单测（M238-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCDSSAdoption,
  buildCDSSV3Report,
  differentialDiagnosis,
} from "../../src/bff/aggregators/cdssV3ReportAggregator";

describe("differentialDiagnosis", () => {
  it("胸痛症状 → 急性心梗优先", () => {
    expect(differentialDiagnosis("胸痛", "高血压").top).toContain("心梗");
  });
});

describe("assessCDSSAdoption", () => {
  it("1000推荐800采纳 → 80%", () => {
    expect(assessCDSSAdoption(1000, 800).adoption).toBe(80);
  });
});

describe("buildCDSSV3Report", () => {
  it("生成鉴别数据", () => {
    const r = buildCDSSV3Report("30d");
    expect(r.differential.cases).toBeGreaterThan(0);
  });

  it("生成用药数据", () => {
    const r = buildCDSSV3Report("30d");
    expect(r.drug.indication).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCDSSV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

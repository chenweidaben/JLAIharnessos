/**
 * 健澜科技 jlmedaios - 国考绩效 55 指标 V5 纯函数单测（M267-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNationalExamV5Report,
  identifyWeakIndicatorsV5,
  scoreNationalExamV5,
} from "../../src/bff/aggregators/nationalExamV5ReportAggregator";

describe("scoreNationalExamV5", () => {
  it("5项指标平均85分 → A级全国前25%", () => {
    const indicators = [
      { name: "医疗质量", score: 85 },
      { name: "运营效率", score: 85 },
      { name: "持续发展", score: 85 },
      { name: "满意度", score: 85 },
      { name: "数据质量", score: 85 },
    ];
    expect(scoreNationalExamV5(indicators, { name: "医疗质量", weight: 1 }).grade).toBe("A");
  });
});

describe("identifyWeakIndicatorsV5", () => {
  it("四级手术60分 vs 全国均值80 → 关键短板", () => {
    const r = identifyWeakIndicatorsV5([{ name: "四级手术", score: 60 }], { name: "四级手术", avg: 80 });
    expect(r.critical.length).toBe(1);
  });
});

describe("buildNationalExamV5Report", () => {
  it("生成医疗质量数据", () => {
    const r = buildNationalExamV5Report("30d");
    expect(r.medicalQuality.grade4Surgery).toBeGreaterThan(0);
  });

  it("生成运营效率数据", () => {
    const r = buildNationalExamV5Report("30d");
    expect(r.operational.los).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildNationalExamV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

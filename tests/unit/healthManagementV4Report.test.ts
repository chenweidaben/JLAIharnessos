/**
 * 健澜科技 jlmedaios - 健康管理 V4 纯函数单测（M253-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessHealthRiskV4,
  buildHealthManagementV4Report,
  trackChronicControlV4,
} from "../../src/bff/aggregators/healthManagementV4ReportAggregator";

describe("trackChronicControlV4", () => {
  it("10个患者6个达标目标 → 60%达标", () => {
    expect(trackChronicControlV4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 6).adequate).toBe(true);
  });
});

describe("assessHealthRiskV4", () => {
  it("问卷40+BMI28+BP140 → 高风险", () => {
    expect(assessHealthRiskV4({ score: 40 }, { bmi: 28, bp: 140 }).level).toBe("高");
  });
});

describe("buildHealthManagementV4Report", () => {
  it("生成档案数据", () => {
    const r = buildHealthManagementV4Report("30d");
    expect(r.records.personal).toBeGreaterThan(0);
  });

  it("生成慢病数据", () => {
    const r = buildHealthManagementV4Report("30d");
    expect(r.chronic.htn).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildHealthManagementV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

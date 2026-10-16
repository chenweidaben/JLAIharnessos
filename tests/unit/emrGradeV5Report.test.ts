/**
 * 健澜科技 jlmedaios - 电子病历分级评价 0-8 级 V5 纯函数单测（M267-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessEMRGradeV5,
  buildEMRGradeV5Report,
  planEMRGapV5,
} from "../../src/bff/aggregators/emrGradeV5ReportAggregator";

describe("assessEMRGradeV5", () => {
  it("5项能力平均85分 → 7级数据应用", () => {
    const r = assessEMRGradeV5({ emrAdoption: 85, structured: 85, closedLoop: 85, cdss: 85, dataGovernance: 85 });
    expect(r.grade).toBe(7);
  });
});

describe("planEMRGapV5", () => {
  it("当前3级目标5级 → 差距2级中优先级", () => {
    const r = planEMRGapV5({ grade: 3 }, { grade: 5 });
    expect(r.gap).toBe(2);
  });
});

describe("buildEMRGradeV5Report", () => {
  it("生成框架数据", () => {
    const r = buildEMRGradeV5Report("30d");
    expect(r.framework.grade).toBeGreaterThanOrEqual(0);
  });

  it("生成EMR应用数据", () => {
    const r = buildEMRGradeV5Report("30d");
    expect(r.emrAdoption.emrRate).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildEMRGradeV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

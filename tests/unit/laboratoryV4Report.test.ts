/**
 * 健澜科技 jlmedaios - 检验 V4 纯函数单测（M251-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessLabQualityV4,
  buildLaboratoryV4Report,
  handleCriticalValueV4,
} from "../../src/bff/aggregators/laboratoryV4ReportAggregator";

describe("assessLabQualityV4", () => {
  it("IQC 99% EQA 100% → 综合100%", () => {
    expect(assessLabQualityV4({ pass: 99, total: 100 }, { pass: 100, total: 100 }).overall).toBe(100);
  });
});

describe("handleCriticalValueV4", () => {
  it("血糖2.5 → 危急值", () => {
    expect(handleCriticalValueV4({ glucose: 2.5, potassium: 4 }, { glucose: [3.9, 22.2], potassium: [3.5, 5.5] }).critical).toBe(true);
  });
});

describe("buildLaboratoryV4Report", () => {
  it("生成检验前数据", () => {
    const r = buildLaboratoryV4Report("30d");
    expect(r.preAnalytic.request).toBeGreaterThan(0);
  });

  it("生成微生物数据", () => {
    const r = buildLaboratoryV4Report("30d");
    expect(r.microbiology.culture).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildLaboratoryV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

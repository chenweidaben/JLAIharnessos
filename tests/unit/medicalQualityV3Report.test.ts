/**
 * 健澜科技 jlmedaios - 医疗质量 V3 纯函数单测（M241-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessClinicalPathway,
  buildMedicalQualityV3Report,
  reviewRationalDrug,
} from "../../src/bff/aggregators/medicalQualityV3ReportAggregator";

describe("assessClinicalPathway", () => {
  it("入径1000完成850变异50 → 完成率85%", () => {
    expect(assessClinicalPathway({ enrolled: 1000, completed: 850, variation: 50 }).completion).toBe(85);
  });
});

describe("reviewRationalDrug", () => {
  it("总1000不合理30 → 3%通过", () => {
    expect(reviewRationalDrug({ total: 1000, irrational: 30 }).pass).toBe(true);
  });
});

describe("buildMedicalQualityV3Report", () => {
  it("生成国家指标数据", () => {
    const r = buildMedicalQualityV3Report("30d");
    expect(r.national.indicators).toBeGreaterThan(0);
  });

  it("生成单病种数据", () => {
    const r = buildMedicalQualityV3Report("30d");
    expect(r.single.ami).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMedicalQualityV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

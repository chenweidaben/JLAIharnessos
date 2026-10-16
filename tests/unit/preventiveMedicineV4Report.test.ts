/**
 * 健澜科技 jlmedaios - 预防公卫 V4 纯函数单测（M249-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessVaccinationCoverageV4,
  buildPreventiveMedicineV4Report,
  predictChronicDiseaseRiskV4,
} from "../../src/bff/aggregators/preventiveMedicineV4ReportAggregator";

describe("assessVaccinationCoverageV4", () => {
  it("人口1000接种950 → 95%覆盖", () => {
    expect(assessVaccinationCoverageV4(1000, 950).coverage).toBe(95);
  });
});

describe("predictChronicDiseaseRiskV4", () => {
  it("50岁BMI28吸烟家族史 → 高风险", () => {
    expect(predictChronicDiseaseRiskV4({ age: 50, bmi: 28, smoking: true, familyHistory: true }).level).toBe("高");
  });
});

describe("buildPreventiveMedicineV4Report", () => {
  it("生成免疫数据", () => {
    const r = buildPreventiveMedicineV4Report("30d");
    expect(r.immunization.vaccines).toBeGreaterThan(0);
  });

  it("生成慢病数据", () => {
    const r = buildPreventiveMedicineV4Report("30d");
    expect(r.chronic.hypertension).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPreventiveMedicineV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 预防医学 V3 纯函数单测（M239-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessVaccinationCoverage,
  buildPreventiveMedicineV3Report,
  predictChronicDiseaseRisk,
} from "../../src/bff/aggregators/preventiveMedicineV3ReportAggregator";

describe("assessVaccinationCoverage", () => {
  it("1000人950剂 → 95%达标", () => {
    expect(assessVaccinationCoverage(1000, 950).meet).toBe(true);
  });
});

describe("predictChronicDiseaseRisk", () => {
  it("60岁+肥胖+吸烟+家族史 → 高风险", () => {
    expect(predictChronicDiseaseRisk({ age: 60, bmi: 30, smoking: true, familyHistory: true }).level).toBe("高");
  });
});

describe("buildPreventiveMedicineV3Report", () => {
  it("生成疫苗数据", () => {
    const r = buildPreventiveMedicineV3Report("30d");
    expect(r.immunization.coverage).toBeGreaterThan(0);
  });

  it("生成慢病数据", () => {
    const r = buildPreventiveMedicineV3Report("30d");
    expect(r.chronic.hypertension).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPreventiveMedicineV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

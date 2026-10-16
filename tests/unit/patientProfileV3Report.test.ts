/**
 * 健澜科技 jlmedaios - 患者画像 V3 纯函数单测（M255-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPatientProfileV3,
  buildPatientProfileV3Report,
  classifyRiskGroupV3,
} from "../../src/bff/aggregators/patientProfileV3ReportAggregator";

describe("buildPatientProfileV3", () => {
  it("70岁高血压糖尿病就诊15次 → 老年+多病共存+高频就诊", () => {
    const p = buildPatientProfileV3({ name: "张三", age: 70 }, { visits: 15, diagnoses: ["高血压", "糖尿病"] });
    expect(p.riskTags.length).toBe(3);
  });
});

describe("classifyRiskGroupV3", () => {
  it("3种慢病3个标签 → 高风险每周随访", () => {
    expect(classifyRiskGroupV3({ chronicCount: 3, riskTags: ["老年", "多病共存", "高频就诊"] }).group).toBe("高风险");
  });
});

describe("buildPatientProfileV3Report", () => {
  it("生成360画像数据", () => {
    const r = buildPatientProfileV3Report("30d");
    expect(r.profile360.patients).toBeGreaterThan(0);
  });

  it("生成慢病标签数据", () => {
    const r = buildPatientProfileV3Report("30d");
    expect(r.chronic.htn).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientProfileV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

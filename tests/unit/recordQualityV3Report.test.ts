/**
 * 健澜科技 jlmedaios - 病历质量 V3 纯函数单测（M256-C 里程碑 v5.00.0）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessRecordGradeV3,
  buildRecordQualityV3Report,
  validateEMRHomePageV3,
} from "../../src/bff/aggregators/recordQualityV3ReportAggregator";

describe("assessRecordGradeV3", () => {
  it("1000份病历30缺陷 → 缺陷率3%达标", () => {
    expect(assessRecordGradeV3(1000, 30).adequate).toBe(true);
  });
});

describe("validateEMRHomePageV3", () => {
  it("主要诊断缺失 → 不有效", () => {
    expect(validateEMRHomePageV3({ primaryDx: "", operation: "阑尾切除", complication: "无" }).valid).toBe(false);
  });
});

describe("buildRecordQualityV3Report", () => {
  it("生成运行病历数据", () => {
    const r = buildRecordQualityV3Report("30d");
    expect(r.running.timely).toBeGreaterThan(0);
  });

  it("生成EMR评级数据", () => {
    const r = buildRecordQualityV3Report("30d");
    expect(r.emrLevel.level5).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildRecordQualityV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

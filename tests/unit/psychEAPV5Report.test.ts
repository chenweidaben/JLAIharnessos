/**
 * 健澜科技 jlmedaios - 心理心身与 EAP V5 单测（M272-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessSuicideRiskV5,
  buildPsychEAPV5Report,
  screenDepressionV5,
} from "../../src/bff/aggregators/psychEAPV5ReportAggregator";

describe("screenDepressionV5", () => {
  it("PHQ-9=20→重度", () => {
    expect(screenDepressionV5(20).level).toBe("重度");
  });
});

describe("assessSuicideRiskV5", () => {
  it("4个风险因子→极高且立即", () => {
    expect(assessSuicideRiskV5(4).risk).toBe("极高");
    expect(assessSuicideRiskV5(4).immediate).toBe(true);
  });
});

describe("buildPsychEAPV5Report", () => {
  it("生成筛查数据", () => {
    expect(buildPsychEAPV5Report("30d").screening.phq9).toBeGreaterThan(0);
  });
  it("生成EAP数据", () => {
    expect(buildPsychEAPV5Report("30d").eap.counseling).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildPsychEAPV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 职业环境 V3 纯函数单测（M239-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessOccupationalExposureV3,
  buildOccupationalEnvironmentalV3Report,
  screenMentalHealth,
} from "../../src/bff/aggregators/occupationalEnvironmentalV3ReportAggregator";

describe("assessOccupationalExposureV3", () => {
  it("暴露150限值100 → 超标", () => {
    expect(assessOccupationalExposureV3(150, 100).exceed).toBe(true);
  });
});

describe("screenMentalHealth", () => {
  it("抑郁+焦虑 → 高风险EAP", () => {
    expect(screenMentalHealth({ score: 20, depression: true, anxiety: true }).eap).toBe(true);
  });
});

describe("buildOccupationalEnvironmentalV3Report", () => {
  it("生成体检数据", () => {
    const r = buildOccupationalEnvironmentalV3Report("30d");
    expect(r.exam.in).toBeGreaterThan(0);
  });

  it("生成环境数据", () => {
    const r = buildOccupationalEnvironmentalV3Report("30d");
    expect(r.environment.air).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOccupationalEnvironmentalV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

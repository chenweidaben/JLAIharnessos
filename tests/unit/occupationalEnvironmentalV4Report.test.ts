/**
 * 健澜科技 jlmedaios - 职业环境 V4 纯函数单测（M249-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessOccupationalExposureV4,
  buildOccupationalEnvironmentalV4Report,
  screenMentalHealthV4,
} from "../../src/bff/aggregators/occupationalEnvironmentalV4ReportAggregator";

describe("assessOccupationalExposureV4", () => {
  it("粉尘超标 → 不合规", () => {
    expect(assessOccupationalExposureV4({ dust: 10, noise: 50, chemical: 1 }, { dust: 8, noise: 85, chemical: 5 }).compliant).toBe(false);
  });
});

describe("screenMentalHealthV4", () => {
  it("PHQ9 12 → 抑郁需转介", () => {
    expect(screenMentalHealthV4({ gds: 3, phq9: 12 }).refer).toBe(true);
  });
});

describe("buildOccupationalEnvironmentalV4Report", () => {
  it("生成体检数据", () => {
    const r = buildOccupationalEnvironmentalV4Report("30d");
    expect(r.exam.on).toBeGreaterThan(0);
  });

  it("生成疾病数据", () => {
    const r = buildOccupationalEnvironmentalV4Report("30d");
    expect(r.disease.pneumoconiosis).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOccupationalEnvironmentalV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

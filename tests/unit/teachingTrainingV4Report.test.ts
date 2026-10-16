/**
 * 健澜科技 jlmedaios - 教学培训 V4 纯函数单测（M254-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessTeachingQualityV4,
  buildTeachingTrainingV4Report,
  trackCMECreditsV4,
} from "../../src/bff/aggregators/teachingTrainingV4ReportAggregator";

describe("assessTeachingQualityV4", () => {
  it("学生评教90同行85OSCE90 → 平均88达标", () => {
    expect(assessTeachingQualityV4({ student: 90, peer: 85, osce: 90 }).adequate).toBe(true);
  });
});

describe("trackCMECreditsV4", () => {
  it("人员100学分3000 → 人均30达标", () => {
    expect(trackCMECreditsV4(100, 3000).adequate).toBe(true);
  });
});

describe("buildTeachingTrainingV4Report", () => {
  it("生成住培数据", () => {
    const r = buildTeachingTrainingV4Report("30d");
    expect(r.residency.trainee).toBeGreaterThan(0);
  });

  it("生成CME数据", () => {
    const r = buildTeachingTrainingV4Report("30d");
    expect(r.cme.typeI).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildTeachingTrainingV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

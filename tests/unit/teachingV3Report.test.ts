/**
 * 健澜科技 jlmedaios - 教学培训 V3 纯函数单测（M242-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessTeachingQualityV3,
  buildTeachingV3Report,
  trackCMECreditsV3,
} from "../../src/bff/aggregators/teachingV3ReportAggregator";

describe("assessTeachingQualityV3", () => {
  it("均分95 → 优秀", () => {
    expect(assessTeachingQualityV3({ avg: 95, pass: 90 }).excellent).toBe(true);
  });
});

describe("trackCMECreditsV3", () => {
  it("人员1000学分15000 → 人均15", () => {
    expect(trackCMECreditsV3(1000, 15000).perCapita).toBe(15);
  });
});

describe("buildTeachingV3Report", () => {
  it("生成住培数据", () => {
    const r = buildTeachingV3Report("30d");
    expect(r.residency.students).toBeGreaterThan(0);
  });

  it("生成研究生数据", () => {
    const r = buildTeachingV3Report("30d");
    expect(r.graduate.master).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildTeachingV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

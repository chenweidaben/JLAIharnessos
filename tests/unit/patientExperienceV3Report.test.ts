/**
 * 健澜科技 jlmedaios - 患者体验 V3 纯函数单测（M241-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPatientExperienceV3Report,
  calculateNPSV3,
  trackPatientJourneyV3,
} from "../../src/bff/aggregators/patientExperienceV3ReportAggregator";

describe("calculateNPSV3", () => {
  it("推荐者80贬损者10 → NPS 78优秀", () => {
    expect(calculateNPSV3(80, 10).level).toBe("优秀");
  });
});

describe("trackPatientJourneyV3", () => {
  it("无投诉 → 已闭环", () => {
    expect(trackPatientJourneyV3("预约", { score: 9, complaint: false }).closed).toBe(true);
  });
});

describe("buildPatientExperienceV3Report", () => {
  it("生成旅程数据", () => {
    const r = buildPatientExperienceV3Report("30d");
    expect(r.journey.booking).toBeGreaterThan(0);
  });

  it("生成满意度数据", () => {
    const r = buildPatientExperienceV3Report("30d");
    expect(r.satisfaction.opd).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientExperienceV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

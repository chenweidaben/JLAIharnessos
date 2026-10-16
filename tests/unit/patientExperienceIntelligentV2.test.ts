/**
 * 健澜科技 jlmedaios - 患者体验智能化 V2 纯函数单测（M235-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPatientExperienceIntelligentV2,
  personalizePatientJourney,
  predictPatientSatisfaction,
} from "../../src/bff/aggregators/patientExperienceIntelligentV2Aggregator";

describe("predictPatientSatisfaction", () => {
  it("投诉+流失 → 低NPS且流失", () => {
    expect(predictPatientSatisfaction("投诉", "流失").churn).toBe(true);
  });
});

describe("personalizePatientJourney", () => {
  it("老年画像 → 6步旅程", () => {
    expect(personalizePatientJourney("老年", "体检").path.length).toBe(6);
  });
});

describe("buildPatientExperienceIntelligentV2", () => {
  it("生成旅程数据", () => {
    const r = buildPatientExperienceIntelligentV2("30d");
    expect(r.journey.ai).toBeGreaterThan(0);
  });

  it("生成NPS数据", () => {
    const r = buildPatientExperienceIntelligentV2("30d");
    expect(r.satisfaction.nps).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientExperienceIntelligentV2("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

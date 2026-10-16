/**
 * 健澜科技 jlmedaios - 患者体验监测与改进 V5 纯函数单测（M270-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeJourneyV5,
  buildPatientExperienceV5Report,
  calculateNPSV5,
} from "../../src/bff/aggregators/patientExperienceV5ReportAggregator";

describe("calculateNPSV5", () => {
  it("推荐者300+贬损者50 → NPS=71优秀", () => {
    expect(calculateNPSV5(300, 50).nps).toBe(71);
  });
});

describe("analyzeJourneyV5", () => {
  it("3触点满意度均85+1个痛点 → 平均85整体良好", () => {
    expect(analyzeJourneyV5([{ name: "挂号", satisfaction: 85, painPoint: false }, { name: "候诊", satisfaction: 80, painPoint: true }, { name: "取药", satisfaction: 90, painPoint: false }]).avg).toBe(85);
  });
});

describe("buildPatientExperienceV5Report", () => {
  it("生成满意度数据", () => {
    const r = buildPatientExperienceV5Report("30d");
    expect(r.satisfaction.outpatient).toBeGreaterThan(0);
  });

  it("生成NPS数据", () => {
    const r = buildPatientExperienceV5Report("30d");
    expect(r.nps.promoters).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientExperienceV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

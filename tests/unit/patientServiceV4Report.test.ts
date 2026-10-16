/**
 * 健澜科技 jlmedaios - 患者服务 V4 纯函数单测（M253-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessPatientSatisfactionV4,
  buildPatientServiceV4Report,
  trackPatientJourneyV4,
} from "../../src/bff/aggregators/patientServiceV4ReportAggregator";

describe("assessPatientSatisfactionV4", () => {
  it("得分950计数1000 → 95%达标", () => {
    expect(assessPatientSatisfactionV4({ score: 950, count: 1000, nps: 60 }).adequate).toBe(true);
  });
});

describe("trackPatientJourneyV4", () => {
  it("评分2分 → 有问题需改进", () => {
    expect(trackPatientJourneyV4("候诊", { rating: 2, comment: "等待久" }).issue).toBe(true);
  });
});

describe("buildPatientServiceV4Report", () => {
  it("生成预约数据", () => {
    const r = buildPatientServiceV4Report("30d");
    expect(r.booking.appointment).toBeGreaterThan(0);
  });

  it("生成 NPS 数据", () => {
    const r = buildPatientServiceV4Report("30d");
    expect(r.nps.outpatient).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientServiceV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 患者安全 V3 纯函数单测（M256-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeRootCauseV3,
  assessSafetyCultureV3,
  buildPatientSafetyV3Report,
} from "../../src/bff/aggregators/patientSafetyV3ReportAggregator";

describe("analyzeRootCauseV3", () => {
  it("跌倒事件 → 环境湿滑II级整改", () => {
    expect(analyzeRootCauseV3({ type: "跌倒", description: "卫生间滑倒" }).level).toBe("II级");
  });
});

describe("assessSafetyCultureV3", () => {
  it("100人调查80正面80 Just Culture → 平均80达标", () => {
    expect(assessSafetyCultureV3({ response: 100, positive: 80, justCulture: 80 }).adequate).toBe(true);
  });
});

describe("buildPatientSafetyV3Report", () => {
  it("生成不良事件数据", () => {
    const r = buildPatientSafetyV3Report("30d");
    expect(r.incident.total).toBeGreaterThan(0);
  });

  it("生成安全目标数据", () => {
    const r = buildPatientSafetyV3Report("30d");
    expect(r.goals.id).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientSafetyV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

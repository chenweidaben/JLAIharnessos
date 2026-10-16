/**
 * 健澜科技 jlmedaios - 患者安全 V3 纯函数单测（M241-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeRootCause,
  buildPatientSafetyV3Report,
  earlyWarningScoreV3,
} from "../../src/bff/aggregators/patientSafetyV3ReportAggregator";

describe("analyzeRootCause", () => {
  it("用药错误事件 → 双人核对", () => {
    expect(analyzeRootCause("用药错误").cause).toContain("双人核对");
  });
});

describe("earlyWarningScoreV3", () => {
  it("低血压+低SpO2 → 预警", () => {
    expect(earlyWarningScoreV3({ hr: 80, bp: 80, rr: 16, temp: 36.5, spo2: 90 }, []).alert).toBe(true);
  });
});

describe("buildPatientSafetyV3Report", () => {
  it("生成不良事件数据", () => {
    const r = buildPatientSafetyV3Report("30d");
    expect(r.adverse.gradeI).toBeGreaterThan(0);
  });

  it("生成早期预警数据", () => {
    const r = buildPatientSafetyV3Report("30d");
    expect(r.earlyWarning.vte).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPatientSafetyV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

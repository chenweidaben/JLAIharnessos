/**
 * 健澜科技 jlmedaios - 智能预警 V3 纯函数单测（M255-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessVTERiskV3,
  buildIntelligentAlertV3Report,
  calculateEarlyWarningV3,
} from "../../src/bff/aggregators/intelligentAlertV3ReportAggregator";

describe("calculateEarlyWarningV3", () => {
  it("HR110+RR22+SpO290+SBP85 → 2+2+3+3=10高危紧急", () => {
    expect(calculateEarlyWarningV3({ hr: 110, rr: 22, spo2: 90, sbp: 85 }, 0).urgent).toBe(true);
  });
});

describe("assessVTERiskV3", () => {
  it("Caprini 6分 → 高危需预防", () => {
    expect(assessVTERiskV3(6, "Caprini").preventive).toBe(true);
  });
});

describe("buildIntelligentAlertV3Report", () => {
  it("生成早期预警数据", () => {
    const r = buildIntelligentAlertV3Report("30d");
    expect(r.earlyWarning.mews).toBeGreaterThan(0);
  });

  it("生成危急值数据", () => {
    const r = buildIntelligentAlertV3Report("30d");
    expect(r.critical.lab).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildIntelligentAlertV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

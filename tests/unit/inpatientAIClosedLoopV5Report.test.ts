/**
 * 健澜科技 jlmedaios - AI 住院全流程闭环 V5 纯函数单测（M258-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDischargePlanV5,
  buildInpatientAIClosedLoopV5Report,
  predictDeteriorationV5,
} from "../../src/bff/aggregators/inpatientAIClosedLoopV5ReportAggregator";

describe("predictDeteriorationV5", () => {
  it("HR110+RR22+SpO290+SBP85 → 恶化概率90%立即", () => {
    expect(predictDeteriorationV5({ hr: 110, rr: 22, spo2: 90, sbp: 85 }, []).urgency).toBe("立即");
  });
});

describe("buildDischargePlanV5", () => {
  it("有药有随访 → 准备就绪", () => {
    expect(buildDischargePlanV5({ name: "张三", diagnosis: "肺炎" }, { meds: ["抗生素"], followup: "2周", rehab: true }).ready).toBe(true);
  });
});

describe("buildInpatientAIClosedLoopV5Report", () => {
  it("生成入院数据", () => {
    const r = buildInpatientAIClosedLoopV5Report("30d");
    expect(r.admission.bedsideSettle).toBeGreaterThan(0);
  });

  it("生成质量数据", () => {
    const r = buildInpatientAIClosedLoopV5Report("30d");
    expect(r.quality.los).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInpatientAIClosedLoopV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

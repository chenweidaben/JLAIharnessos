/**
 * 健澜科技 jlmedaios - AI 药事全流程闭环 V5 纯函数单测（M258-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPharmacyAIClosedLoopV5Report,
  predictAdherenceV5,
  reviewPrescriptionV5,
} from "../../src/bff/aggregators/pharmacyAIClosedLoopV5ReportAggregator";

describe("reviewPrescriptionV5", () => {
  it("肾衰+氨基糖苷 → 不通过", () => {
    expect(reviewPrescriptionV5({ drug: "氨基糖苷", dose: 50, frequency: "bid" }, { age: 60, renal: "poor" }).pass).toBe(false);
  });
});

describe("predictAdherenceV5", () => {
  it("小学+低收入+qid+60天+2000元 → 高风险", () => {
    expect(predictAdherenceV5({ education: "小学", income: "低" }, { frequency: 4, duration: 60, cost: 2000 }).risk).toBe("高风险");
  });
});

describe("buildPharmacyAIClosedLoopV5Report", () => {
  it("生成前置审核数据", () => {
    const r = buildPharmacyAIClosedLoopV5Report("30d");
    expect(r.preReview.aiReview).toBeGreaterThan(0);
  });

  it("生成质量数据", () => {
    const r = buildPharmacyAIClosedLoopV5Report("30d");
    expect(r.quality.rxPass).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPharmacyAIClosedLoopV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

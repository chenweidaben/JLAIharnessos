/**
 * 健澜科技 jlmedaios - AI 辅助诊断（统计）V13 单测（M366-A，stats避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAiDiagnosisAccuracyV13,
  computeAiDiagnosisRateV13,
  computeAiSuggestionAdoptionRateV13,
  type AiDiagnosisStatsRecordV13,
} from "../../src/bff/aggregators/aiDiagnosisStatsV13Aggregator";
import { aiDiagnosisStatsV13Routes } from "../../src/bff/routes/aiDiagnosisStatsV13";

const records: AiDiagnosisStatsRecordV13[] = [
  { caseCount: 1000, aiAssisted: 800, aiAccurate: 760, aiSuggestionAdopted: 600 },
  { caseCount: 1000, aiAssisted: 800, aiAccurate: 760, aiSuggestionAdopted: 600 },
];

describe("computeAiDiagnosisRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("AI 辅助诊断率 = 80.00%", () => {
    expect(computeAiDiagnosisRateV13(records)).toBe(80.00);
  });
  it("空态 → 0", () => {
    expect(computeAiDiagnosisRateV13([])).toBe(0);
  });
});

describe("computeAiDiagnosisAccuracyV13", () => {
  // 算式：(760+760)/(800+800) = 1520/1600×100 = 95.00
  it("AI 诊断准确率 = 95.00%", () => {
    expect(computeAiDiagnosisAccuracyV13(records)).toBe(95.00);
  });
});

describe("computeAiSuggestionAdoptionRateV13", () => {
  // 算式：(600+600)/(800+800) = 1200/1600×100 = 75.00
  it("AI 建议采纳率 = 75.00%", () => {
    expect(computeAiSuggestionAdoptionRateV13(records)).toBe(75.00);
  });
});

describe("aiDiagnosisStatsV13Routes 读路由", () => {
  it("GET /api/v1/ai-diagnosis-stats 路由存在且 auth:true", () => {
    const route = aiDiagnosisStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ai-diagnosis-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 传承效果度量与院长报告 V13 单测（M297-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSuccessionReportV13,
  computeKnowledgeContinuityV13,
  measureHandoverEffectV13,
  type QualityCaseV13,
  type ReuseLogV13,
  type StudyPlanMiniV13,
} from "../../src/bff/aggregators/successionReportV13Aggregator";
import { successionReportV13Routes } from "../../src/bff/routes/successionReportV13";

const plan: StudyPlanMiniV13 = { totalItems: 10, studiedItems: 8, avgStudyScore: 85 };

const reuseLogs: ReuseLogV13[] = [
  { reuseId: "r-1", experienceId: "e-1" },
  { reuseId: "r-2", experienceId: "e-2" },
  { reuseId: "r-3", experienceId: "e-3" },
];

const prevCases: QualityCaseV13[] = [
  { caseId: "c-1", qualityScore: 90 },
  { caseId: "c-2", qualityScore: 80 },
];

const newCases: QualityCaseV13[] = [
  { caseId: "n-1", qualityScore: 88 },
  { caseId: "n-2", qualityScore: 82 },
];

describe("measureHandoverEffectV13", () => {
  it("完成率=8/10=80，复用=3，均分=85", () => {
    const e = measureHandoverEffectV13(plan, reuseLogs);
    expect(e.studyCompletionRate).toBe(80);
    expect(e.reuseCount).toBe(3);
    expect(e.avgStudyScore).toBe(85);
  });
  it("空 plan → 完成率=0", () => {
    const e = measureHandoverEffectV13({ totalItems: 0, studiedItems: 0, avgStudyScore: 0 }, []);
    expect(e.studyCompletionRate).toBe(0);
  });
});

describe("computeKnowledgeContinuityV13", () => {
  it("prevAvg=85 newAvg=85 diff=0 → 100", () => {
    expect(computeKnowledgeContinuityV13(prevCases, newCases)).toBe(100);
  });
  it("空数组 → 0", () => {
    expect(computeKnowledgeContinuityV13([], [])).toBe(0);
  });
});

describe("buildSuccessionReportV13", () => {
  it("overall=80*0.5+100*0.5=90 → low", () => {
    const e = measureHandoverEffectV13(plan, reuseLogs);
    const c = computeKnowledgeContinuityV13(prevCases, newCases);
    const r = buildSuccessionReportV13(e, c);
    expect(r.overallScore).toBe(90);
    expect(r.riskLevel).toBe("low");
  });
});

describe("successionReportV13Routes 读路由", () => {
  it("GET /api/v1/succession-report 路由存在且 auth:true", () => {
    const route = successionReportV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/succession-report",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

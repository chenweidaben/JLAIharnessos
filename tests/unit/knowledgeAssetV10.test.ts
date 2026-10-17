/**
 * 健澜科技 jlmedaios - 医院级 AI 知识资产大盘 V10 单测（M292-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHospitalKnowledgeAssetV10,
  computeKnowledgeGrowthV10,
  identifyKnowledgeGapV10,
  type DoctorGraphMiniV10,
  type FailureClusterV10,
  type PracticeMiniV10,
} from "../../src/bff/aggregators/knowledgeAssetV10Aggregator";
import { knowledgeAssetV10Routes } from "../../src/bff/routes/knowledgeAssetV10";

const clusters: FailureClusterV10[] = [
  { rootCause: "medication_error", count: 12 },
  { rootCause: "diagnosis_error", count: 8 },
  { rootCause: "communication_delay", count: 5 },
];

const practices: PracticeMiniV10[] = [
  { condition: "急性心梗", sourceCaseCnt: 5 },
  { condition: "急性心衰", sourceCaseCnt: 3 },
];

const graphs: DoctorGraphMiniV10[] = [
  { doctorId: "d-001", knowledgeDensity: 57 },
  { doctorId: "d-002", knowledgeDensity: 30 },
];

describe("buildHospitalKnowledgeAssetV10", () => {
  it("failure=25 practice=2 doctor=2 avgDensity=43.5", () => {
    const a = buildHospitalKnowledgeAssetV10(clusters, practices, graphs);
    expect(a.failureTotal).toBe(25);
    expect(a.practiceTotal).toBe(2);
    expect(a.doctorCount).toBe(2);
    expect(a.avgDensity).toBe(43.5);
  });
  it("空态→全部为0", () => {
    const a = buildHospitalKnowledgeAssetV10([], [], []);
    expect(a.failureTotal).toBe(0);
    expect(a.avgDensity).toBe(0);
  });
});

describe("computeKnowledgeGrowthV10", () => {
  it("prev=28/1/40 this=25/2/43.5 → drop=10.7% growth=100% density=8.8%", () => {
    const prev = buildHospitalKnowledgeAssetV10([{ rootCause: "x", count: 28 }], [{ condition: "a", sourceCaseCnt: 1 }], graphs.map((g) => ({ ...g, knowledgeDensity: 40 })));
    const cur = buildHospitalKnowledgeAssetV10(clusters, practices, graphs);
    const g = computeKnowledgeGrowthV10(prev, cur);
    expect(g.failureDropRatePct).toBeCloseTo(10.7, 1);
    expect(g.practiceGrowthRatePct).toBe(100);
    expect(g.densityGrowthRatePct).toBeCloseTo(8.8, 1);
  });
});

describe("identifyKnowledgeGapV10", () => {
  it("medication_error=12 / practice=2 = 6 ≥ 2 → red", () => {
    const a = buildHospitalKnowledgeAssetV10(clusters, practices, graphs);
    const gap = identifyKnowledgeGapV10(a, clusters, practices);
    expect(gap.gapRootCause).toBe("medication_error");
    expect(gap.light).toBe("red");
  });
  it("空聚类→green 缺口—", () => {
    const gap = identifyKnowledgeGapV10(buildHospitalKnowledgeAssetV10([], [], []), [], []);
    expect(gap.light).toBe("green");
    expect(gap.gapRootCause).toBe("—");
  });
});

describe("knowledgeAssetV10Routes 读路由", () => {
  it("GET /api/v1/knowledge/asset-dashboard 路由存在且 auth:true", () => {
    const route = knowledgeAssetV10Routes.find((r) => r.method === "GET" && r.path === "/api/v1/knowledge/asset-dashboard");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

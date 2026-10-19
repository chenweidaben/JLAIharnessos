/**
 * 健澜科技 jlmedaios - 病历AI病案利用分析 V14 单测（M556-D，M556 收官）
 *
 * 测试 buildAiRecordUtilizationAnalysis 构建 AI 病案利用分析、analyzeRecordUtilizationByAi AI 病案利用分析、buildAiRecordUtilizationAnalysisReport 构建病案利用分析报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRecordUtilizationAnalysis,
  buildAiRecordUtilizationAnalysisReport,
  analyzeRecordUtilizationByAi,
  type AiRecordUtilizationAnalysisInputV14,
} from "../../src/bff/aggregators/emrAiRecordUtilizationAnalysisV14Aggregator";
import { emrAiRecordUtilizationAnalysisV14Routes } from "../../src/bff/routes/emrAiRecordUtilizationAnalysisV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRecordUtilizationAnalysis 构建 AI 病案利用分析", () => {
  // 手算：recordId='RECB048', dept='病案室' → 正确构建
  it("recordId='RECB048', dept='病案室' → 正确构建", () => {
    const base = buildAiRecordUtilizationAnalysis("RECB048", "病案室");
    expect(base.recordId).toBe("RECB048");
    expect(base.dept).toBe("病案室");
  });
});

describe("analyzeRecordUtilizationByAi 高利用", () => {
  // 手算：{totalRecords=1000, borrowedRecords=200, referencedRecords=150}
  // 手算：borrowRate = Math.round(200/1000*1000)/10 = Math.round(200)/10 = 20.0
  // 手算：referRate = Math.round(150/1000*1000)/10 = Math.round(150)/10 = 15.0
  // 手算：合计 20.0+15.0=35 >= 30 → utilizationLevel='高利用'
  it("{totalRecords=1000, borrowedRecords=200, referencedRecords=150} → borrowRate=20.0, referRate=15.0, utilizationLevel='高利用'", () => {
    const input: AiRecordUtilizationAnalysisInputV14 = { totalRecords: 1000, borrowedRecords: 200, referencedRecords: 150 };
    const result = analyzeRecordUtilizationByAi(input);
    expect(result.borrowRate).toBe(20.0);
    expect(result.referRate).toBe(15.0);
    expect(result.utilizationLevel).toBe("高利用");
  });
});

describe("analyzeRecordUtilizationByAi 低利用", () => {
  // 手算：{totalRecords=1000, borrowedRecords=30, referencedRecords=20}
  // 手算：borrowRate = Math.round(30/1000*1000)/10 = Math.round(30)/10 = 3.0
  // 手算：referRate = Math.round(20/1000*1000)/10 = Math.round(20)/10 = 2.0
  // 手算：合计 3.0+2.0=5 < 10 → utilizationLevel='低利用'
  it("{totalRecords=1000, borrowedRecords=30, referencedRecords=20} → borrowRate=3.0, referRate=2.0, utilizationLevel='低利用'", () => {
    const input: AiRecordUtilizationAnalysisInputV14 = { totalRecords: 1000, borrowedRecords: 30, referencedRecords: 20 };
    const result = analyzeRecordUtilizationByAi(input);
    expect(result.borrowRate).toBe(3.0);
    expect(result.referRate).toBe(2.0);
    expect(result.utilizationLevel).toBe("低利用");
  });
});

describe("buildAiRecordUtilizationAnalysisReport 构建病案利用分析报告", () => {
  // 手算：{borrowRate=20.0, referRate=15.0, utilizationLevel='高利用'}
  // 手算：透传 borrowRate + referRate + utilizationLevel
  it("{borrowRate=20.0, referRate=15.0, utilizationLevel='高利用'} → 正确返回（透传）", () => {
    const report = buildAiRecordUtilizationAnalysisReport({ borrowRate: 20.0, referRate: 15.0, utilizationLevel: "高利用" });
    expect(report.borrowRate).toBe(20.0);
    expect(report.referRate).toBe(15.0);
    expect(report.utilizationLevel).toBe("高利用");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-record-utilization-analysis auth:true", () => {
    const def = (emrAiRecordUtilizationAnalysisV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-record-utilization-analysis");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

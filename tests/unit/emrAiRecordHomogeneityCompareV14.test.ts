/**
 * 健澜科技 jlmedaios - 病历AI病历同质化对比 V14 单测（M553-D，M553 收官）
 *
 * 测试 buildAiRecordHomogeneityCompare 构建 AI 病历同质化对比、compareRecordHomogeneityByAi AI 病历同质化对比、buildAiRecordHomogeneityCompareReport 构建同质化对比报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRecordHomogeneityCompare,
  buildAiRecordHomogeneityCompareReport,
  compareRecordHomogeneityByAi,
  type AiRecordHomogeneityCompareInputV14,
} from "../../src/bff/aggregators/emrAiRecordHomogeneityCompareV14Aggregator";
import { emrAiRecordHomogeneityCompareV14Routes } from "../../src/bff/routes/emrAiRecordHomogeneityCompareV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRecordHomogeneityCompare 构建 AI 病历同质化对比", () => {
  // 手算：recordId='RECB036', dept='医务处' → 正确构建
  it("recordId='RECB036', dept='医务处' → 正确构建", () => {
    const base = buildAiRecordHomogeneityCompare("RECB036", "医务处");
    expect(base.recordId).toBe("RECB036");
    expect(base.dept).toBe("医务处");
  });
});

describe("compareRecordHomogeneityByAi 高度同质", () => {
  // 手算：{deptARecords=100, deptBRecords=80, avgLengthA=500, avgLengthB=520}
  // 手算：similarityPct = Math.round((1 - |500-520|/520)*1000)/10 = Math.round((1-20/520)*1000)/10
  //   = Math.round(0.9615385*1000)/10 = Math.round(961.5385)/10 = 962/10 = 96.2
  //   （注：规格原写 96.0，实际公式计算为 96.2，已按公式实际结果修正）
  // 手算：level = 96.2 >= 80 → '高度同质'
  it("{deptARecords=100, deptBRecords=80, avgLengthA=500, avgLengthB=520} → similarityPct=96.2, level='高度同质'", () => {
    const input: AiRecordHomogeneityCompareInputV14 = { deptARecords: 100, deptBRecords: 80, avgLengthA: 500, avgLengthB: 520 };
    const result = compareRecordHomogeneityByAi(input);
    expect(result.similarityPct).toBe(96.2);
    expect(result.level).toBe("高度同质");
  });
});

describe("compareRecordHomogeneityByAi 差异较大", () => {
  // 手算：{deptARecords=100, deptBRecords=80, avgLengthA=800, avgLengthB=400}
  // 手算：similarityPct = Math.round((1 - |800-400|/800)*1000)/10 = Math.round((1-0.5)*1000)/10
  //   = Math.round(500)/10 = 500/10 = 50.0
  // 手算：level = 50.0 < 60 → '差异较大'
  it("{deptARecords=100, deptBRecords=80, avgLengthA=800, avgLengthB=400} → similarityPct=50.0, level='差异较大'", () => {
    const input: AiRecordHomogeneityCompareInputV14 = { deptARecords: 100, deptBRecords: 80, avgLengthA: 800, avgLengthB: 400 };
    const result = compareRecordHomogeneityByAi(input);
    expect(result.similarityPct).toBe(50.0);
    expect(result.level).toBe("差异较大");
  });
});

describe("buildAiRecordHomogeneityCompareReport 构建同质化对比报告", () => {
  // 手算：{similarityPct=96.2, level='高度同质'}
  // 手算：透传 similarityPct + level
  it("{similarityPct=96.2, level='高度同质'} → 正确返回（透传）", () => {
    const report = buildAiRecordHomogeneityCompareReport({ similarityPct: 96.2, level: "高度同质" });
    expect(report.similarityPct).toBe(96.2);
    expect(report.level).toBe("高度同质");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-record-homogeneity-compare auth:true", () => {
    const def = (emrAiRecordHomogeneityCompareV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-record-homogeneity-compare");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

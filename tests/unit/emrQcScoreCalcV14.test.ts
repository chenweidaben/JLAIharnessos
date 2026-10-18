/**
 * 健澜科技 jlmedaios - 质控评分自动计算 V14 单测（M492-B）
 *
 * 测试 calculateQcScore 计算、buildScoreCalcReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  calculateQcScore,
  buildScoreCalcReport,
  type ScoreCalcReportV14,
  type DeductionV14,
} from "../../src/bff/aggregators/emrQcScoreCalcV14Aggregator";
import { emrQcScoreCalcV14Routes } from "../../src/bff/routes/emrQcScoreCalcV14";
import type { RouteDef } from "../../src/bff/types";

describe("calculateQcScore 扣分5+10", () => {
  // 手算：[{rule:'缺主诉',points:5},{rule:'缺诊断',points:10}] → score=85（100-5-10=85）
  it("扣 5+10 分 → score=85", () => {
    const deductions: DeductionV14[] = [
      { rule: "缺主诉", points: 5 },
      { rule: "缺诊断", points: 10 },
    ];
    const score = calculateQcScore(deductions);
    expect(score).toBe(85);
  });
});

describe("calculateQcScore 无扣分", () => {
  // 手算：[] → score=100
  it("无扣分 → score=100", () => {
    const deductions: DeductionV14[] = [];
    const score = calculateQcScore(deductions);
    expect(score).toBe(100);
  });
});

describe("buildScoreCalcReport 扣分15", () => {
  // 手算：扣分 5+10 → totalDeduction=15, finalScore=85
  it("扣 5+10 分 → totalDeduction=15, finalScore=85", () => {
    const deductions: DeductionV14[] = [
      { rule: "缺主诉", points: 5 },
      { rule: "缺诊断", points: 10 },
    ];
    const report: ScoreCalcReportV14 = buildScoreCalcReport(deductions);
    expect(report.totalDeduction).toBe(15);
    expect(report.finalScore).toBe(85);
  });
});

describe("buildScoreCalcReport 扣分30", () => {
  // 手算：扣分 30 → totalDeduction=30, finalScore=70
  it("扣 30 分 → totalDeduction=30, finalScore=70", () => {
    const deductions: DeductionV14[] = [
      { rule: "严重缺陷", points: 30 },
    ];
    const report: ScoreCalcReportV14 = buildScoreCalcReport(deductions);
    expect(report.totalDeduction).toBe(30);
    expect(report.finalScore).toBe(70);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-score-calc auth:true", () => {
    const def = (emrQcScoreCalcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-score-calc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

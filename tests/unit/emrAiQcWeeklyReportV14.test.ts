/**
 * 健澜科技 jlmedaios - 病历AI质控周报生成 V14 单测（M548-A）
 *
 * 测试 buildAiQcWeeklyReport 构建 AI 质控周报、generateQcWeeklyReportByAi AI 质控周报生成、buildAiQcWeeklyReportReport 构建周报报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQcWeeklyReport,
  buildAiQcWeeklyReportReport,
  generateQcWeeklyReportByAi,
  type AiQcWeeklyReportInputV14,
} from "../../src/bff/aggregators/emrAiQcWeeklyReportV14Aggregator";
import { emrAiQcWeeklyReportV14Routes } from "../../src/bff/routes/emrAiQcWeeklyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQcWeeklyReport 构建 AI 质控周报", () => {
  // 手算：recordId='RECB013', dept='内科' → 正确构建
  it("recordId='RECB013', dept='内科' → 正确构建", () => {
    const base = buildAiQcWeeklyReport("RECB013", "内科");
    expect(base.recordId).toBe("RECB013");
    expect(base.dept).toBe("内科");
  });
});

describe("generateQcWeeklyReportByAi 高合格率", () => {
  // 手算：{totalRecords=100, defectCount=5}
  // 手算：passRate = Math.round((100-5)/100*1000)/10 = Math.round(950)/10 = 950/10 = 95.0
  // 手算：summary = `本周抽查100份病历，缺陷5份，合格率95%`
  it("{totalRecords=100, defectCount=5} → passRate=95.0，summary 含 '合格率95%'", () => {
    const input: AiQcWeeklyReportInputV14 = { totalRecords: 100, defectCount: 5 };
    const result = generateQcWeeklyReportByAi(input);
    expect(result.passRate).toBe(95.0);
    expect(result.summary).toContain("合格率95%");
  });
});

describe("generateQcWeeklyReportByAi 一般", () => {
  // 手算：{totalRecords=50, defectCount=10}
  // 手算：passRate = Math.round((50-10)/50*1000)/10 = Math.round(800)/10 = 800/10 = 80.0
  // 手算：summary = `本周抽查50份病历，缺陷10份，合格率80%`
  it("{totalRecords=50, defectCount=10} → passRate=80.0，summary 含 '合格率80%'", () => {
    const input: AiQcWeeklyReportInputV14 = { totalRecords: 50, defectCount: 10 };
    const result = generateQcWeeklyReportByAi(input);
    expect(result.passRate).toBe(80.0);
    expect(result.summary).toContain("合格率80%");
  });
});

describe("buildAiQcWeeklyReportReport 构建周报报告", () => {
  // 手算：{passRate=95.0, summary='本周抽查100份病历，缺陷5份，合格率95%'}
  // 手算：透传 passRate + summary
  it("{passRate=95.0, summary='...'} → 正确返回（透传）", () => {
    const report = buildAiQcWeeklyReportReport({
      passRate: 95.0,
      summary: "本周抽查100份病历，缺陷5份，合格率95%",
    });
    expect(report.passRate).toBe(95.0);
    expect(report.summary).toBe("本周抽查100份病历，缺陷5份，合格率95%");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-qc-weekly-report auth:true", () => {
    const def = (emrAiQcWeeklyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-qc-weekly-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

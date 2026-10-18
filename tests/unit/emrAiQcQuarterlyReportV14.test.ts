/**
 * 健澜科技 jlmedaios - 病历AI质控季报生成 V14 单测（M548-C）
 *
 * 测试 buildAiQcQuarterlyReport 构建 AI 质控季报、generateQcQuarterlyReportByAi AI 质控季报生成、buildAiQcQuarterlyReportReport 构建季报报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQcQuarterlyReport,
  buildAiQcQuarterlyReportReport,
  generateQcQuarterlyReportByAi,
  type AiQcQuarterlyReportInputV14,
} from "../../src/bff/aggregators/emrAiQcQuarterlyReportV14Aggregator";
import { emrAiQcQuarterlyReportV14Routes } from "../../src/bff/routes/emrAiQcQuarterlyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQcQuarterlyReport 构建 AI 质控季报", () => {
  // 手算：recordId='RECB015', dept='医务处' → 正确构建
  it("recordId='RECB015', dept='医务处' → 正确构建", () => {
    const base = buildAiQcQuarterlyReport("RECB015", "医务处");
    expect(base.recordId).toBe("RECB015");
    expect(base.dept).toBe("医务处");
  });
});

describe("generateQcQuarterlyReportByAi 优秀", () => {
  // 手算：{totalRecords=1500, defectCount=90, topDept='普外科'}
  // 手算：passRate = Math.round((1500-90)/1500*1000)/10 = Math.round(940)/10 = 94.0
  // 手算：passRate=94.0 → 94>=90 → grade='优秀'
  it("{totalRecords=1500, defectCount=90, topDept='普外科'} → passRate=94.0, grade='优秀'", () => {
    const input: AiQcQuarterlyReportInputV14 = { totalRecords: 1500, defectCount: 90, topDept: "普外科" };
    const result = generateQcQuarterlyReportByAi(input);
    expect(result.passRate).toBe(94.0);
    expect(result.grade).toBe("优秀");
  });
});

describe("generateQcQuarterlyReportByAi 待改进", () => {
  // 手算：{totalRecords=1200, defectCount=300, topDept='中医科'}
  // 手算：passRate = Math.round((1200-300)/1200*1000)/10 = Math.round(750)/10 = 75.0
  // 手算：passRate=75.0 → 75<80 → grade='待改进'
  it("{totalRecords=1200, defectCount=300, topDept='中医科'} → passRate=75.0, grade='待改进'", () => {
    const input: AiQcQuarterlyReportInputV14 = { totalRecords: 1200, defectCount: 300, topDept: "中医科" };
    const result = generateQcQuarterlyReportByAi(input);
    expect(result.passRate).toBe(75.0);
    expect(result.grade).toBe("待改进");
  });
});

describe("buildAiQcQuarterlyReportReport 构建季报报告", () => {
  // 手算：{passRate=94.0, grade='优秀', summary='本季度抽查1500份病历，缺陷90份，合格率94%，评级优秀，重点关注普外科'}
  // 手算：透传 passRate + grade + summary
  it("{passRate=94.0, grade='优秀', summary='...'} → 正确返回（透传）", () => {
    const report = buildAiQcQuarterlyReportReport({
      passRate: 94.0,
      grade: "优秀",
      summary: "本季度抽查1500份病历，缺陷90份，合格率94%，评级优秀，重点关注普外科",
    });
    expect(report.passRate).toBe(94.0);
    expect(report.grade).toBe("优秀");
    expect(report.summary).toBe("本季度抽查1500份病历，缺陷90份，合格率94%，评级优秀，重点关注普外科");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-qc-quarterly-report auth:true", () => {
    const def = (emrAiQcQuarterlyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-qc-quarterly-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

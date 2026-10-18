/**
 * 健澜科技 jlmedaios - 病历AI质控月报生成 V14 单测（M548-B）
 *
 * 测试 buildAiQcMonthlyReport 构建 AI 质控月报、generateQcMonthlyReportByAi AI 质控月报生成、buildAiQcMonthlyReportReport 构建月报报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQcMonthlyReport,
  buildAiQcMonthlyReportReport,
  generateQcMonthlyReportByAi,
  type AiQcMonthlyReportInputV14,
} from "../../src/bff/aggregators/emrAiQcMonthlyReportV14Aggregator";
import { emrAiQcMonthlyReportV14Routes } from "../../src/bff/routes/emrAiQcMonthlyReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQcMonthlyReport 构建 AI 质控月报", () => {
  // 手算：recordId='RECB014', dept='医务处' → 正确构建
  it("recordId='RECB014', dept='医务处' → 正确构建", () => {
    const base = buildAiQcMonthlyReport("RECB014", "医务处");
    expect(base.recordId).toBe("RECB014");
    expect(base.dept).toBe("医务处");
  });
});

describe("generateQcMonthlyReportByAi 上升", () => {
  // 手算：{totalRecords=500, defectCount=30, deptCount=12}
  // 手算：passRate = Math.round((500-30)/500*1000)/10 = Math.round(940)/10 = 94.0
  // 手算：passRate=94.0 → 94>=90 → trend='上升'
  it("{totalRecords=500, defectCount=30, deptCount=12} → passRate=94.0, trend='上升'", () => {
    const input: AiQcMonthlyReportInputV14 = { totalRecords: 500, defectCount: 30, deptCount: 12 };
    const result = generateQcMonthlyReportByAi(input);
    expect(result.passRate).toBe(94.0);
    expect(result.trend).toBe("上升");
  });
});

describe("generateQcMonthlyReportByAi 下降", () => {
  // 手算：{totalRecords=300, defectCount=80, deptCount=8}
  // 手算：passRate = Math.round((300-80)/300*1000)/10 = Math.round(733.33...)/10 = 733/10 = 73.3
  // 手算：passRate=73.3 → 73.3<80 → trend='下降'
  it("{totalRecords=300, defectCount=80, deptCount=8} → passRate=73.3, trend='下降'", () => {
    const input: AiQcMonthlyReportInputV14 = { totalRecords: 300, defectCount: 80, deptCount: 8 };
    const result = generateQcMonthlyReportByAi(input);
    expect(result.passRate).toBe(73.3);
    expect(result.trend).toBe("下降");
  });
});

describe("buildAiQcMonthlyReportReport 构建月报报告", () => {
  // 手算：{passRate=94.0, trend='上升', summary='本月抽查500份病历，覆盖12个科室，缺陷30份，合格率94%，趋势上升'}
  // 手算：透传 passRate + trend + summary
  it("{passRate=94.0, trend='上升', summary='...'} → 正确返回（透传）", () => {
    const report = buildAiQcMonthlyReportReport({
      passRate: 94.0,
      trend: "上升",
      summary: "本月抽查500份病历，覆盖12个科室，缺陷30份，合格率94%，趋势上升",
    });
    expect(report.passRate).toBe(94.0);
    expect(report.trend).toBe("上升");
    expect(report.summary).toBe("本月抽查500份病历，覆盖12个科室，缺陷30份，合格率94%，趋势上升");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-qc-monthly-report auth:true", () => {
    const def = (emrAiQcMonthlyReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-qc-monthly-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

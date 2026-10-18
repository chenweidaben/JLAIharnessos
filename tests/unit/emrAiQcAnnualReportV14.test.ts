/**
 * 健澜科技 jlmedaios - 病历AI质控年报生成 V14 单测（M548-D，M548 收官）
 *
 * 测试 buildAiQcAnnualReport 构建 AI 质控年报、generateQcAnnualReportByAi AI 质控年报生成、buildAiQcAnnualReportReport 构建年报报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQcAnnualReport,
  buildAiQcAnnualReportReport,
  generateQcAnnualReportByAi,
  type AiQcAnnualReportInputV14,
} from "../../src/bff/aggregators/emrAiQcAnnualReportV14Aggregator";
import { emrAiQcAnnualReportV14Routes } from "../../src/bff/routes/emrAiQcAnnualReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQcAnnualReport 构建 AI 质控年报", () => {
  // 手算：recordId='RECB016', dept='院领导' → 正确构建
  it("recordId='RECB016', dept='院领导' → 正确构建", () => {
    const base = buildAiQcAnnualReport("RECB016", "院领导");
    expect(base.recordId).toBe("RECB016");
    expect(base.dept).toBe("院领导");
  });
});

describe("generateQcAnnualReportByAi 优秀", () => {
  // 手算：{totalRecords=6000, defectCount=240, bestDept='心内科', worstDept='中医科'}
  // 手算：passRate = Math.round((6000-240)/6000*1000)/10 = Math.round(960)/10 = 96.0
  // 手算：passRate=96.0 → 96>=95 → rank='优秀'
  it("{totalRecords=6000, defectCount=240, bestDept='心内科', worstDept='中医科'} → passRate=96.0, rank='优秀'", () => {
    const input: AiQcAnnualReportInputV14 = { totalRecords: 6000, defectCount: 240, bestDept: "心内科", worstDept: "中医科" };
    const result = generateQcAnnualReportByAi(input);
    expect(result.passRate).toBe(96.0);
    expect(result.rank).toBe("优秀");
  });
});

describe("generateQcAnnualReportByAi 一般", () => {
  // 手算：{totalRecords=5000, defectCount=900, bestDept='普外科', worstDept='急诊科'}
  // 手算：passRate = Math.round((5000-900)/5000*1000)/10 = Math.round(820)/10 = 82.0
  // 手算：passRate=82.0 → 82<85 → rank='一般'
  it("{totalRecords=5000, defectCount=900, bestDept='普外科', worstDept='急诊科'} → passRate=82.0, rank='一般'", () => {
    const input: AiQcAnnualReportInputV14 = { totalRecords: 5000, defectCount: 900, bestDept: "普外科", worstDept: "急诊科" };
    const result = generateQcAnnualReportByAi(input);
    expect(result.passRate).toBe(82.0);
    expect(result.rank).toBe("一般");
  });
});

describe("buildAiQcAnnualReportReport 构建年报报告", () => {
  // 手算：{passRate=96.0, rank='优秀', summary='本年度抽查6000份病历，缺陷240份，合格率96%，评级优秀，最佳科室心内科，重点整改中医科'}
  // 手算：透传 passRate + rank + summary
  it("{passRate=96.0, rank='优秀', summary='...'} → 正确返回（透传）", () => {
    const report = buildAiQcAnnualReportReport({
      passRate: 96.0,
      rank: "优秀",
      summary: "本年度抽查6000份病历，缺陷240份，合格率96%，评级优秀，最佳科室心内科，重点整改中医科",
    });
    expect(report.passRate).toBe(96.0);
    expect(report.rank).toBe("优秀");
    expect(report.summary).toBe("本年度抽查6000份病历，缺陷240份，合格率96%，评级优秀，最佳科室心内科，重点整改中医科");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-qc-annual-report auth:true", () => {
    const def = (emrAiQcAnnualReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-qc-annual-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

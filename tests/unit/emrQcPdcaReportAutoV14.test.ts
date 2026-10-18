/**
 * 健澜科技 jlmedaios - 质控PDCA报告自动生成 V14 单测（M518-D，M518 收官，避让 -auto）
 *
 * 测试 buildPdcaReportAuto 构建报告、generatePdcaReportAuto 生成改进指标、buildPdcaReportAutoSummary 构建摘要、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPdcaReportAuto,
  buildPdcaReportAutoSummary,
  generatePdcaReportAuto,
  type PdcaMetricsAutoV14,
} from "../../src/bff/aggregators/emrQcPdcaReportAutoV14Aggregator";
import { emrQcPdcaReportAutoV14Routes } from "../../src/bff/routes/emrQcPdcaReportAutoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPdcaReportAuto 构建报告", () => {
  // 手算：projectName='病历书写质量改进', dept='心内科', phase='Check' → 正确构建
  it("projectName='病历书写质量改进', dept='心内科', phase='Check' → 正确构建", () => {
    const report = buildPdcaReportAuto("病历书写质量改进", "心内科", "Check");
    expect(report.projectName).toBe("病历书写质量改进");
    expect(report.dept).toBe("心内科");
    expect(report.phase).toBe("Check");
  });
});

describe("generatePdcaReportAuto 生成改进指标", () => {
  // 手算：metrics={beforeScore:70, afterScore:85} → improvement=85-70=15
  // 手算：improvementRate=15/70×100=21.428...→保留 1 位小数=21.4
  it("metrics={beforeScore:70, afterScore:85} → improvement=15, improvementRate=21.4", () => {
    const report = buildPdcaReportAuto("病历书写质量改进", "心内科", "Check");
    const metrics: PdcaMetricsAutoV14 = { beforeScore: 70, afterScore: 85 };
    const result = generatePdcaReportAuto(report, metrics);
    expect(result.improvement).toBe(15);
    expect(result.improvementRate).toBe(21.4);
  });
});

describe("buildPdcaReportAutoSummary 构建摘要", () => {
  // 手算：improvementRate=21.4 >= 20 → status='显著改进'
  it("{improvement:15, improvementRate:21.4} → status='显著改进'", () => {
    const summary = buildPdcaReportAutoSummary({ improvement: 15, improvementRate: 21.4 });
    expect(summary.status).toBe("显著改进");
  });
});

describe("generatePdcaReportAuto beforeScore=0 边界", () => {
  // 手算：metrics={beforeScore:0, afterScore:50} → improvement=50-0=50
  // 手算：beforeScore=0 → improvementRate=0（分母为 0 返回 0）
  it("metrics={beforeScore:0, afterScore:50} → improvement=50, improvementRate=0", () => {
    const report = buildPdcaReportAuto("病历书写质量改进", "心内科", "Check");
    const metrics: PdcaMetricsAutoV14 = { beforeScore: 0, afterScore: 50 };
    const result = generatePdcaReportAuto(report, metrics);
    expect(result.improvement).toBe(50);
    expect(result.improvementRate).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-pdca-auto-report auth:true", () => {
    const def = (emrQcPdcaReportAutoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-pdca-auto-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

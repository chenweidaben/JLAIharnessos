/**
 * 健澜科技 jlmedaios - 病历质控科室质量报告 V14 单测（M475-B）
 *
 * 测试 buildDeptReport 通过率计算、summarizeDeptFindings 改进建议、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptReport,
  summarizeDeptFindings,
  type DeptQcReportV14,
} from "../../src/bff/aggregators/emrDeptQcReportV14Aggregator";
import { emrDeptQcReportV14Routes } from "../../src/bff/routes/emrDeptQcReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptReport 内科", () => {
  // 手算：内科，1000 份 950 过 → passRate = 950/1000×100 = 95
  it("内科，1000 份 950 过 → passRate=95", () => {
    const report = buildDeptReport("内科", { totalRecords: 1000, passCount: 950, defectCount: 50 });
    expect(report.passRate).toBe(95);
  });
});

describe("buildDeptReport 外科", () => {
  // 手算：外科，2000 份 1700 过 → passRate = 1700/2000×100 = 85
  it("外科，2000 份 1700 过 → passRate=85", () => {
    const report = buildDeptReport("外科", { totalRecords: 2000, passCount: 1700, defectCount: 300 });
    expect(report.passRate).toBe(85);
  });
});

describe("summarizeDeptFindings 持续改进", () => {
  // 手算：passRate=95 → 85<=95<=95 → 含"持续改进"
  it("passRate=95 → 建议含'持续改进'", () => {
    const report: DeptQcReportV14 = {
      dept: "内科",
      totalRecords: 1000,
      passCount: 950,
      defectCount: 50,
      passRate: 95,
    };
    const findings = summarizeDeptFindings(report);
    expect(findings).toContain("持续改进");
  });
});

describe("summarizeDeptFindings 需重点整改", () => {
  // 手算：passRate=75 → <85 → 含"需重点整改"
  it("passRate=75 → 建议含'需重点整改'", () => {
    const report: DeptQcReportV14 = {
      dept: "外科",
      totalRecords: 1000,
      passCount: 750,
      defectCount: 250,
      passRate: 75,
    };
    const findings = summarizeDeptFindings(report);
    expect(findings).toContain("需重点整改");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-dept-qc-report auth:true", () => {
    const def = (emrDeptQcReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-dept-qc-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

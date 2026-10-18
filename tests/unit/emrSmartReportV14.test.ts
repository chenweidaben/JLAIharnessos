/**
 * 健澜科技 jlmedaios - 病历质控智能报表 V14 单测（M470-D，M470 收官）
 *
 * 测试 buildSmartReport 通过率/缺陷率、extractKeyFindings 关键发现、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSmartReport,
  extractKeyFindings,
  type SmartReportInputV14,
} from "../../src/bff/aggregators/emrSmartReportV14Aggregator";
import { emrSmartReportV14Routes } from "../../src/bff/routes/emrSmartReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSmartReport 通过率/缺陷率", () => {
  // 手算：1000 份病历，950 过 → passRate = 950/1000×100 = 95
  // defectCount=50 → defectRate = 50/1000×100 = 5
  it("1000 份 950 过 → passRate=95，defectCount=50 → defectRate=5", () => {
    const input: SmartReportInputV14 = {
      period: "2026-10",
      totalRecords: 1000,
      passCount: 950,
      defectCount: 50,
    };
    const report = buildSmartReport(input);
    expect(report.passRate).toBe(95);
    expect(report.defectRate).toBe(5);
  });
});

describe("buildSmartReport 2000 份", () => {
  // 手算：totalRecords=2000，passCount=1900 → passRate = 1900/2000×100 = 95
  it("totalRecords=2000，passCount=1900 → passRate=95", () => {
    const input: SmartReportInputV14 = {
      period: "2026-10",
      totalRecords: 2000,
      passCount: 1900,
      defectCount: 100,
    };
    const report = buildSmartReport(input);
    expect(report.passRate).toBe(95);
  });
});

describe("extractKeyFindings 质控良好", () => {
  // 手算：passRate=95 > 90 → 含"质控情况良好"
  it("passRate=95 → 含'质控情况良好'", () => {
    const report = buildSmartReport({
      period: "2026-10",
      totalRecords: 1000,
      passCount: 950,
      defectCount: 50,
    });
    const findings = extractKeyFindings(report);
    expect(findings).toContain("质控情况良好");
  });
});

describe("extractKeyFindings 需重点整改", () => {
  // 手算：passRate=75 < 80 → 含"需重点整改"
  it("passRate=75 → 含'需重点整改'", () => {
    const report = buildSmartReport({
      period: "2026-10",
      totalRecords: 1000,
      passCount: 750,
      defectCount: 250,
    });
    const findings = extractKeyFindings(report);
    expect(findings).toContain("需重点整改");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-smart-report/:reportId auth:true", () => {
    const def = (emrSmartReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-smart-report/:reportId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 质控-检验检查联动 V14 单测（M514-A）
 *
 * 测试 buildLabExamLink 构建联动数据、checkLabExamConsistency 检查检验检查一致性、buildLabExamLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildLabExamLink,
  buildLabExamLinkReport,
  checkLabExamConsistency,
  type LabExamConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcLabExamLinkV14Aggregator";
import { emrQcLabExamLinkV14Routes } from "../../src/bff/routes/emrQcLabExamLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildLabExamLink 构建联动数据", () => {
  // 手算：recordId='REC005', labCount=3, examCount=2 → 正确构建
  it("recordId='REC005', labCount=3, examCount=2 → 正确构建", () => {
    const link = buildLabExamLink("REC005", 3, 2);
    expect(link.recordId).toBe("REC005");
    expect(link.labCount).toBe(3);
    expect(link.examCount).toBe(2);
  });
});

describe("checkLabExamConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasLabReport:true, hasExamReport:true, hasDiagnosis:true} → pass=true, defects=[]", () => {
    const record: LabExamConsistencyRecordV14 = { hasLabReport: true, hasExamReport: true, hasDiagnosis: true };
    const result = checkLabExamConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkLabExamConsistency 缺检验报告", () => {
  // 手算：hasLabReport=false → pass=false, defects 包含'缺检验报告'
  it("{hasLabReport:false, hasExamReport:true, hasDiagnosis:true} → pass=false, defects 包含'缺检验报告'", () => {
    const record: LabExamConsistencyRecordV14 = { hasLabReport: false, hasExamReport: true, hasDiagnosis: true };
    const result = checkLabExamConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺检验报告");
  });
});

describe("buildLabExamLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺检验报告','缺检查报告']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺检验报告','缺检查报告']} → defectCount=2", () => {
    const report = buildLabExamLinkReport({ pass: false, defects: ["缺检验报告", "缺检查报告"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-lab-exam-link auth:true", () => {
    const def = (emrQcLabExamLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-lab-exam-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

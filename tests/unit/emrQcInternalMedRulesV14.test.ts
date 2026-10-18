/**
 * 健澜科技 jlmedaios - 质控内科专科规则 V14 单测（M509-A）
 *
 * 测试 buildInternalMedRules 规则列表、checkInternalMed 检查、buildInternalMedReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildInternalMedReport,
  buildInternalMedRules,
  checkInternalMed,
  type InternalMedRecordV14,
} from "../../src/bff/aggregators/emrQcInternalMedRulesV14Aggregator";
import { emrQcInternalMedRulesV14Routes } from "../../src/bff/routes/emrQcInternalMedRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildInternalMedRules 规则列表", () => {
  // 手算：rules 包含 3 条以上内科规则
  it("rules 包含 3 条以上内科规则", () => {
    const rules = buildInternalMedRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkInternalMed 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasChiefComplaint:true, hasDiagnosis:true, hasMedication:true} → pass=true, defects=[]", () => {
    const record: InternalMedRecordV14 = { hasChiefComplaint: true, hasDiagnosis: true, hasMedication: true };
    const result = checkInternalMed(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkInternalMed 缺主诉", () => {
  // 手算：hasChiefComplaint=false → pass=false, defects 包含'缺主诉'
  it("{hasChiefComplaint:false, hasDiagnosis:true, hasMedication:true} → pass=false, defects 包含'缺主诉'", () => {
    const record: InternalMedRecordV14 = { hasChiefComplaint: false, hasDiagnosis: true, hasMedication: true };
    const result = checkInternalMed(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺主诉");
  });
});

describe("buildInternalMedReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺主诉','缺诊断']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺主诉','缺诊断']} → defectCount=2", () => {
    const report = buildInternalMedReport({ pass: false, defects: ["缺主诉", "缺诊断"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-internal-med-rules auth:true", () => {
    const def = (emrQcInternalMedRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-internal-med-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

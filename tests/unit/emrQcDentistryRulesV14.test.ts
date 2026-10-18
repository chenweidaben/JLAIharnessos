/**
 * 健澜科技 jlmedaios - 质控口腔科专科规则 V14 单测（M511-C）
 *
 * 测试 buildDentistryRules 规则列表、checkDentistry 检查、buildDentistryReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDentistryReport,
  buildDentistryRules,
  checkDentistry,
  type DentistryRecordV14,
} from "../../src/bff/aggregators/emrQcDentistryRulesV14Aggregator";
import { emrQcDentistryRulesV14Routes } from "../../src/bff/routes/emrQcDentistryRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDentistryRules 规则列表", () => {
  // 手算：rules 包含 3 条以上口腔科规则
  it("rules 包含 3 条以上口腔科规则", () => {
    const rules = buildDentistryRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkDentistry 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasToothChart:true, hasXray:true, hasTreatmentPlan:true} → pass=true, defects=[]", () => {
    const record: DentistryRecordV14 = { hasToothChart: true, hasXray: true, hasTreatmentPlan: true };
    const result = checkDentistry(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkDentistry 缺牙位图", () => {
  // 手算：hasToothChart=false → pass=false, defects 包含'缺牙位图'
  it("{hasToothChart:false, hasXray:true, hasTreatmentPlan:true} → pass=false, defects 包含'缺牙位图'", () => {
    const record: DentistryRecordV14 = { hasToothChart: false, hasXray: true, hasTreatmentPlan: true };
    const result = checkDentistry(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺牙位图");
  });
});

describe("buildDentistryReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺牙位图','缺X光片']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺牙位图','缺X光片']} → defectCount=2", () => {
    const report = buildDentistryReport({ pass: false, defects: ["缺牙位图", "缺X光片"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dentistry-rules auth:true", () => {
    const def = (emrQcDentistryRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dentistry-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

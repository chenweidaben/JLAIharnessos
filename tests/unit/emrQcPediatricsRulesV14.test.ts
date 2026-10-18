/**
 * 健澜科技 jlmedaios - 质控儿科专科规则 V14 单测（M509-C）
 *
 * 测试 buildPediatricsRules 规则列表、checkPediatrics 检查、buildPediatricsReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPediatricsReport,
  buildPediatricsRules,
  checkPediatrics,
  type PediatricsRecordV14,
} from "../../src/bff/aggregators/emrQcPediatricsRulesV14Aggregator";
import { emrQcPediatricsRulesV14Routes } from "../../src/bff/routes/emrQcPediatricsRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPediatricsRules 规则列表", () => {
  // 手算：rules 包含 3 条以上儿科规则
  it("rules 包含 3 条以上儿科规则", () => {
    const rules = buildPediatricsRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkPediatrics 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasGrowthChart:true, hasVaccinationRecord:true, hasDevelopmentNote:true} → pass=true, defects=[]", () => {
    const record: PediatricsRecordV14 = { hasGrowthChart: true, hasVaccinationRecord: true, hasDevelopmentNote: true };
    const result = checkPediatrics(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkPediatrics 缺生长发育曲线", () => {
  // 手算：hasGrowthChart=false → pass=false, defects 包含'缺生长发育曲线'
  it("{hasGrowthChart:false, hasVaccinationRecord:true, hasDevelopmentNote:true} → pass=false, defects 包含'缺生长发育曲线'", () => {
    const record: PediatricsRecordV14 = { hasGrowthChart: false, hasVaccinationRecord: true, hasDevelopmentNote: true };
    const result = checkPediatrics(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺生长发育曲线");
  });
});

describe("buildPediatricsReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺生长发育曲线','缺疫苗接种记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺生长发育曲线','缺疫苗接种记录']} → defectCount=2", () => {
    const report = buildPediatricsReport({ pass: false, defects: ["缺生长发育曲线", "缺疫苗接种记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-pediatrics-rules auth:true", () => {
    const def = (emrQcPediatricsRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-pediatrics-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

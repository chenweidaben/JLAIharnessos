/**
 * 健澜科技 jlmedaios - 质控营养科专科规则 V14 单测（M512-C）
 *
 * 测试 buildNutritionRules 规则列表、checkNutrition 检查、buildNutritionReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNutritionReport,
  buildNutritionRules,
  checkNutrition,
  type NutritionRecordV14,
} from "../../src/bff/aggregators/emrQcNutritionRulesV14Aggregator";
import { emrQcNutritionRulesV14Routes } from "../../src/bff/routes/emrQcNutritionRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNutritionRules 规则列表", () => {
  // 手算：rules 包含 3 条以上营养科规则
  it("rules 包含 3 条以上营养科规则", () => {
    const rules = buildNutritionRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkNutrition 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasNutritionAssessment:true, hasDietOrder:true, hasFollowUp:true} → pass=true, defects=[]", () => {
    const record: NutritionRecordV14 = { hasNutritionAssessment: true, hasDietOrder: true, hasFollowUp: true };
    const result = checkNutrition(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkNutrition 缺营养评估", () => {
  // 手算：hasNutritionAssessment=false → pass=false, defects 包含'缺营养评估'
  it("{hasNutritionAssessment:false, hasDietOrder:true, hasFollowUp:true} → pass=false, defects 包含'缺营养评估'", () => {
    const record: NutritionRecordV14 = { hasNutritionAssessment: false, hasDietOrder: true, hasFollowUp: true };
    const result = checkNutrition(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺营养评估");
  });
});

describe("buildNutritionReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺营养评估','缺饮食医嘱']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺营养评估','缺饮食医嘱']} → defectCount=2", () => {
    const report = buildNutritionReport({ pass: false, defects: ["缺营养评估", "缺饮食医嘱"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-nutrition-rules auth:true", () => {
    const def = (emrQcNutritionRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-nutrition-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

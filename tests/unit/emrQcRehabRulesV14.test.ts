/**
 * 健澜科技 jlmedaios - 质控康复科专科规则 V14 单测（M510-D，M510 收官）
 *
 * 测试 buildRehabRules 规则列表、checkRehab 检查、buildRehabReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRehabReport,
  buildRehabRules,
  checkRehab,
  type RehabRecordV14,
} from "../../src/bff/aggregators/emrQcRehabRulesV14Aggregator";
import { emrQcRehabRulesV14Routes } from "../../src/bff/routes/emrQcRehabRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRehabRules 规则列表", () => {
  // 手算：rules 包含 3 条以上康复科规则
  it("rules 包含 3 条以上康复科规则", () => {
    const rules = buildRehabRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkRehab 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasAssessment:true, hasTreatmentPlan:true, hasProgressNote:true} → pass=true, defects=[]", () => {
    const record: RehabRecordV14 = { hasAssessment: true, hasTreatmentPlan: true, hasProgressNote: true };
    const result = checkRehab(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkRehab 缺康复评估", () => {
  // 手算：hasAssessment=false → pass=false, defects 包含'缺康复评估'
  it("{hasAssessment:false, hasTreatmentPlan:true, hasProgressNote:true} → pass=false, defects 包含'缺康复评估'", () => {
    const record: RehabRecordV14 = { hasAssessment: false, hasTreatmentPlan: true, hasProgressNote: true };
    const result = checkRehab(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺康复评估");
  });
});

describe("buildRehabReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺康复评估','缺治疗计划']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺康复评估','缺治疗计划']} → defectCount=2", () => {
    const report = buildRehabReport({ pass: false, defects: ["缺康复评估", "缺治疗计划"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-rehab-rules auth:true", () => {
    const def = (emrQcRehabRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-rehab-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

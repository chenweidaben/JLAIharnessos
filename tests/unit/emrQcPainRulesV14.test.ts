/**
 * 健澜科技 jlmedaios - 质控疼痛科专科规则 V14 单测（M512-D，M512 收官）
 *
 * 测试 buildPainRules 规则列表、checkPain 检查、buildPainReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPainReport,
  buildPainRules,
  checkPain,
  type PainRecordV14,
} from "../../src/bff/aggregators/emrQcPainRulesV14Aggregator";
import { emrQcPainRulesV14Routes } from "../../src/bff/routes/emrQcPainRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPainRules 规则列表", () => {
  // 手算：rules 包含 3 条以上疼痛科规则
  it("rules 包含 3 条以上疼痛科规则", () => {
    const rules = buildPainRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkPain 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasPainScore:true, hasTreatmentPlan:true, hasFollowUp:true} → pass=true, defects=[]", () => {
    const record: PainRecordV14 = { hasPainScore: true, hasTreatmentPlan: true, hasFollowUp: true };
    const result = checkPain(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkPain 缺疼痛评分", () => {
  // 手算：hasPainScore=false → pass=false, defects 包含'缺疼痛评分'
  it("{hasPainScore:false, hasTreatmentPlan:true, hasFollowUp:true} → pass=false, defects 包含'缺疼痛评分'", () => {
    const record: PainRecordV14 = { hasPainScore: false, hasTreatmentPlan: true, hasFollowUp: true };
    const result = checkPain(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺疼痛评分");
  });
});

describe("buildPainReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺疼痛评分','缺治疗计划']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺疼痛评分','缺治疗计划']} → defectCount=2", () => {
    const report = buildPainReport({ pass: false, defects: ["缺疼痛评分", "缺治疗计划"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-pain-rules auth:true", () => {
    const def = (emrQcPainRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-pain-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

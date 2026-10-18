/**
 * 健澜科技 jlmedaios - 质控病理科专科规则 V14 单测（M512-B）
 *
 * 测试 buildPathologyRules 规则列表、checkPathology 检查、buildPathologyReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPathologyReport,
  buildPathologyRules,
  checkPathology,
  type PathologyRecordV14,
} from "../../src/bff/aggregators/emrQcPathologyRulesV14Aggregator";
import { emrQcPathologyRulesV14Routes } from "../../src/bff/routes/emrQcPathologyRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPathologyRules 规则列表", () => {
  // 手算：rules 包含 3 条以上病理科规则
  it("rules 包含 3 条以上病理科规则", () => {
    const rules = buildPathologyRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkPathology 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasSpecimenLabel:true, hasReport:true, hasDiagnosis:true} → pass=true, defects=[]", () => {
    const record: PathologyRecordV14 = { hasSpecimenLabel: true, hasReport: true, hasDiagnosis: true };
    const result = checkPathology(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkPathology 缺标本标签", () => {
  // 手算：hasSpecimenLabel=false → pass=false, defects 包含'缺标本标签'
  it("{hasSpecimenLabel:false, hasReport:true, hasDiagnosis:true} → pass=false, defects 包含'缺标本标签'", () => {
    const record: PathologyRecordV14 = { hasSpecimenLabel: false, hasReport: true, hasDiagnosis: true };
    const result = checkPathology(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺标本标签");
  });
});

describe("buildPathologyReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺标本标签','缺病理报告']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺标本标签','缺病理报告']} → defectCount=2", () => {
    const report = buildPathologyReport({ pass: false, defects: ["缺标本标签", "缺病理报告"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-pathology-rules auth:true", () => {
    const def = (emrQcPathologyRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-pathology-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

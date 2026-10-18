/**
 * 健澜科技 jlmedaios - 质控眼科专科规则 V14 单测（M511-B）
 *
 * 测试 buildOphthalmologyRules 规则列表、checkOphthalmology 检查、buildOphthalmologyReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOphthalmologyReport,
  buildOphthalmologyRules,
  checkOphthalmology,
  type OphthalmologyRecordV14,
} from "../../src/bff/aggregators/emrQcOphthalmologyRulesV14Aggregator";
import { emrQcOphthalmologyRulesV14Routes } from "../../src/bff/routes/emrQcOphthalmologyRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildOphthalmologyRules 规则列表", () => {
  // 手算：rules 包含 3 条以上眼科规则
  it("rules 包含 3 条以上眼科规则", () => {
    const rules = buildOphthalmologyRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkOphthalmology 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasVisualAcuity:true, hasFundusExam:true, hasRefractionNote:true} → pass=true, defects=[]", () => {
    const record: OphthalmologyRecordV14 = { hasVisualAcuity: true, hasFundusExam: true, hasRefractionNote: true };
    const result = checkOphthalmology(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkOphthalmology 缺视力记录", () => {
  // 手算：hasVisualAcuity=false → pass=false, defects 包含'缺视力记录'
  it("{hasVisualAcuity:false, hasFundusExam:true, hasRefractionNote:true} → pass=false, defects 包含'缺视力记录'", () => {
    const record: OphthalmologyRecordV14 = { hasVisualAcuity: false, hasFundusExam: true, hasRefractionNote: true };
    const result = checkOphthalmology(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺视力记录");
  });
});

describe("buildOphthalmologyReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺视力记录','缺眼底检查']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺视力记录','缺眼底检查']} → defectCount=2", () => {
    const report = buildOphthalmologyReport({ pass: false, defects: ["缺视力记录", "缺眼底检查"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-ophthalmology-rules auth:true", () => {
    const def = (emrQcOphthalmologyRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-ophthalmology-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 质控耳鼻喉科专科规则 V14 单测（M511-D，M511 收官）
 *
 * 测试 buildEntRules 规则列表、checkEnt 检查、buildEntReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildEntReport,
  buildEntRules,
  checkEnt,
  type EntRecordV14,
} from "../../src/bff/aggregators/emrQcEntRulesV14Aggregator";
import { emrQcEntRulesV14Routes } from "../../src/bff/routes/emrQcEntRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildEntRules 规则列表", () => {
  // 手算：rules 包含 3 条以上耳鼻喉科规则
  it("rules 包含 3 条以上耳鼻喉科规则", () => {
    const rules = buildEntRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkEnt 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasEarExam:true, hasNoseExam:true, hasThroatExam:true} → pass=true, defects=[]", () => {
    const record: EntRecordV14 = { hasEarExam: true, hasNoseExam: true, hasThroatExam: true };
    const result = checkEnt(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkEnt 缺耳部检查", () => {
  // 手算：hasEarExam=false → pass=false, defects 包含'缺耳部检查'
  it("{hasEarExam:false, hasNoseExam:true, hasThroatExam:true} → pass=false, defects 包含'缺耳部检查'", () => {
    const record: EntRecordV14 = { hasEarExam: false, hasNoseExam: true, hasThroatExam: true };
    const result = checkEnt(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺耳部检查");
  });
});

describe("buildEntReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺耳部检查','缺鼻部检查']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺耳部检查','缺鼻部检查']} → defectCount=2", () => {
    const report = buildEntReport({ pass: false, defects: ["缺耳部检查", "缺鼻部检查"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-ent-rules auth:true", () => {
    const def = (emrQcEntRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-ent-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

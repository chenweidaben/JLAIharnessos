/**
 * 健澜科技 jlmedaios - 质控皮肤科专科规则 V14 单测（M511-A）
 *
 * 测试 buildDermatologyRules 规则列表、checkDermatology 检查、buildDermatologyReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDermatologyReport,
  buildDermatologyRules,
  checkDermatology,
  type DermatologyRecordV14,
} from "../../src/bff/aggregators/emrQcDermatologyRulesV14Aggregator";
import { emrQcDermatologyRulesV14Routes } from "../../src/bff/routes/emrQcDermatologyRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDermatologyRules 规则列表", () => {
  // 手算：rules 包含 3 条以上皮肤科规则
  it("rules 包含 3 条以上皮肤科规则", () => {
    const rules = buildDermatologyRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkDermatology 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasLesionDescription:true, hasPhotoDocument:true, hasTreatmentPlan:true} → pass=true, defects=[]", () => {
    const record: DermatologyRecordV14 = { hasLesionDescription: true, hasPhotoDocument: true, hasTreatmentPlan: true };
    const result = checkDermatology(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkDermatology 缺皮损描述", () => {
  // 手算：hasLesionDescription=false → pass=false, defects 包含'缺皮损描述'
  it("{hasLesionDescription:false, hasPhotoDocument:true, hasTreatmentPlan:true} → pass=false, defects 包含'缺皮损描述'", () => {
    const record: DermatologyRecordV14 = { hasLesionDescription: false, hasPhotoDocument: true, hasTreatmentPlan: true };
    const result = checkDermatology(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺皮损描述");
  });
});

describe("buildDermatologyReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺皮损描述','缺照片记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺皮损描述','缺照片记录']} → defectCount=2", () => {
    const report = buildDermatologyReport({ pass: false, defects: ["缺皮损描述", "缺照片记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dermatology-rules auth:true", () => {
    const def = (emrQcDermatologyRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dermatology-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

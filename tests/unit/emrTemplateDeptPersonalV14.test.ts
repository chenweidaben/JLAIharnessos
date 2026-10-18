/**
 * 健澜科技 jlmedaios - 模板科室个性化 V14 单测（M524-B）
 *
 * 测试 buildDeptPersonal 构建个性化、customizeDeptTemplate 科室定制、buildDeptPersonalReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptPersonal,
  buildDeptPersonalReport,
  customizeDeptTemplate,
  type DeptCustomizeInputV14,
} from "../../src/bff/aggregators/emrTemplateDeptPersonalV14Aggregator";
import { emrTemplateDeptPersonalV14Routes } from "../../src/bff/routes/emrTemplateDeptPersonalV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptPersonal 构建个性化", () => {
  // 手算：dept='心内科', templateName='入院记录模板' → 正确构建
  it("dept='心内科', templateName='入院记录模板' → 正确构建", () => {
    const personal = buildDeptPersonal("心内科", "入院记录模板");
    expect(personal.dept).toBe("心内科");
    expect(personal.templateName).toBe("入院记录模板");
  });
});

describe("customizeDeptTemplate 无重叠", () => {
  // 手算：baseFields=['主诉','现病史'], deptSpecificFields=['心内科专项评估']
  // 手算：无重叠 → finalFields=['主诉','现病史','心内科专项评估']（3 项）
  // 手算：addedFields = deptSpecificFields.length = 1
  it("baseFields=['主诉','现病史'], deptSpecificFields=['心内科专项评估'] → finalFields 含 3 项, addedFields=1", () => {
    const input: DeptCustomizeInputV14 = {
      baseFields: ["主诉", "现病史"],
      deptSpecificFields: ["心内科专项评估"],
    };
    const result = customizeDeptTemplate(input);
    expect(result.finalFields.length).toBe(3);
    expect(result.finalFields).toContain("心内科专项评估");
    expect(result.addedFields).toBe(1);
  });
});

describe("customizeDeptTemplate 有重叠", () => {
  // 手算：baseFields=['主诉','现病史','既往史'], deptSpecificFields=['既往史','心脏超声结果']
  // 手算：'既往史'重叠去重 → finalFields=['主诉','现病史','既往史','心脏超声结果']（4 项）
  // 手算：addedFields = deptSpecificFields.length = 2（不去重）
  it("baseFields=['主诉','现病史','既往史'], deptSpecificFields=['既往史','心脏超声结果'] → finalFields=去重后 4 项, addedFields=2", () => {
    const input: DeptCustomizeInputV14 = {
      baseFields: ["主诉", "现病史", "既往史"],
      deptSpecificFields: ["既往史", "心脏超声结果"],
    };
    const result = customizeDeptTemplate(input);
    expect(result.finalFields.length).toBe(4);
    expect(result.finalFields).toContain("既往史");
    expect(result.finalFields).toContain("心脏超声结果");
    expect(result.addedFields).toBe(2);
  });
});

describe("buildDeptPersonalReport 构建报告", () => {
  // 手算：{finalFields:['主诉','现病史','既往史','心脏超声结果'], addedFields:2}
  // 手算：totalFields = finalFields.length = 4
  // 手算：addedFields = 2（透传）
  it("{finalFields:['主诉','现病史','既往史','心脏超声结果'], addedFields:2} → totalFields=4, addedFields=2", () => {
    const report = buildDeptPersonalReport({
      finalFields: ["主诉", "现病史", "既往史", "心脏超声结果"],
      addedFields: 2,
    });
    expect(report.totalFields).toBe(4);
    expect(report.addedFields).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-dept-personal auth:true", () => {
    const def = (emrTemplateDeptPersonalV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-dept-personal");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

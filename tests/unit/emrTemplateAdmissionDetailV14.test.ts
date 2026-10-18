/**
 * 健澜科技 jlmedaios - 入院记录模板细化 V14 单测（M523-B）
 *
 * 测试 buildAdmissionDetail 构建细化、renderAdmissionTemplate 渲染入院模板、buildAdmissionDetailReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAdmissionDetail,
  buildAdmissionDetailReport,
  renderAdmissionTemplate,
  type AdmissionRenderInputV14,
} from "../../src/bff/aggregators/emrTemplateAdmissionDetailV14Aggregator";
import { emrTemplateAdmissionDetailV14Routes } from "../../src/bff/routes/emrTemplateAdmissionDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAdmissionDetail 构建细化", () => {
  // 手算：dept='心内科', templateVersion='v3.2' → 正确构建
  it("dept='心内科', templateVersion='v3.2' → 正确构建", () => {
    const detail = buildAdmissionDetail("心内科", "v3.2");
    expect(detail.dept).toBe("心内科");
    expect(detail.templateVersion).toBe("v3.2");
  });
});

describe("renderAdmissionTemplate 渲染模板", () => {
  // 手算：input={sections=['主诉','现病史','既往史'], patientName='张三'}
  // 手算：fieldCount = 3 × 3 = 9
  // 手算：sections.join('')='主诉现病史既往史' → JS UTF-16 length=8（2+3+3）
  // 手算：patientName='张三' → length=2
  // 手算：renderedLength = 8 + 2 = 10
  it("input={sections=['主诉','现病史','既往史'], patientName='张三'} → fieldCount=9, renderedLength=10", () => {
    const input: AdmissionRenderInputV14 = {
      sections: ["主诉", "现病史", "既往史"],
      patientName: "张三",
    };
    const result = renderAdmissionTemplate(input);
    expect(result.fieldCount).toBe(9);
    expect(result.renderedLength).toBe(10);
  });
});

describe("renderAdmissionTemplate 多段落", () => {
  // 手算：input={sections=['主诉','现病史','既往史','个人史','家族史'], patientName='李四'}
  // 手算：fieldCount = 5 × 3 = 15
  it("input={sections=['主诉','现病史','既往史','个人史','家族史'], patientName='李四'} → fieldCount=15", () => {
    const input: AdmissionRenderInputV14 = {
      sections: ["主诉", "现病史", "既往史", "个人史", "家族史"],
      patientName: "李四",
    };
    const result = renderAdmissionTemplate(input);
    expect(result.fieldCount).toBe(15);
  });
});

describe("buildAdmissionDetailReport 构建报告", () => {
  // 手算：{fieldCount:9, renderedLength:10} → 正确返回（透传）
  it("{fieldCount:9, renderedLength:10} → 正确返回", () => {
    const report = buildAdmissionDetailReport({ fieldCount: 9, renderedLength: 10 });
    expect(report.fieldCount).toBe(9);
    expect(report.renderedLength).toBe(10);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-admission-detail auth:true", () => {
    const def = (emrTemplateAdmissionDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-admission-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

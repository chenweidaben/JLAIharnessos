/**
 * 健澜科技 jlmedaios - 出院小结模板标准化 V14 单测（M523-D，M523 收官）
 *
 * 测试 buildDischargeStd 构建标准化、standardizeDischargeTemplate 标准化出院模板、buildDischargeStdReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDischargeStd,
  buildDischargeStdReport,
  standardizeDischargeTemplate,
  type DischargeStdInputV14,
} from "../../src/bff/aggregators/emrTemplateDischargeStdV14Aggregator";
import { emrTemplateDischargeStdV14Routes } from "../../src/bff/routes/emrTemplateDischargeStdV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDischargeStd 构建标准化", () => {
  // 手算：dept='心内科', stdVersion='v4.0' → 正确构建
  it("dept='心内科', stdVersion='v4.0' → 正确构建", () => {
    const std = buildDischargeStd("心内科", "v4.0");
    expect(std.dept).toBe("心内科");
    expect(std.stdVersion).toBe("v4.0");
  });
});

describe("standardizeDischargeTemplate 全部填写", () => {
  // 手算：input={diagnosis='冠心病', treatment='PCI术后', followUp='1月后复诊'}
  // 手算：3 字段都非空 → hasDiagnosis=true, hasTreatment=true, hasFollowUp=true
  // 手算：3 个 true → standardScore = 3 × 33.3 = 99.9
  it("input={diagnosis='冠心病', treatment='PCI术后', followUp='1月后复诊'} → 3 字段都 true, standardScore=99.9", () => {
    const input: DischargeStdInputV14 = { diagnosis: "冠心病", treatment: "PCI术后", followUp: "1月后复诊" };
    const result = standardizeDischargeTemplate(input);
    expect(result.hasDiagnosis).toBe(true);
    expect(result.hasTreatment).toBe(true);
    expect(result.hasFollowUp).toBe(true);
    expect(result.standardScore).toBeCloseTo(99.9, 1);
  });
});

describe("standardizeDischargeTemplate 部分缺失", () => {
  // 手算：input={diagnosis='冠心病', treatment='', followUp='1月后复诊'}
  // 手算：diagnosis='冠心病'非空→hasDiagnosis=true; treatment=''空→hasTreatment=false; followUp='1月后复诊'非空→hasFollowUp=true
  // 手算：2 个 true → standardScore = 2 × 33.3 = 66.6
  it("input={diagnosis='冠心病', treatment='', followUp='1月后复诊'} → hasTreatment=false, standardScore=66.6", () => {
    const input: DischargeStdInputV14 = { diagnosis: "冠心病", treatment: "", followUp: "1月后复诊" };
    const result = standardizeDischargeTemplate(input);
    expect(result.hasDiagnosis).toBe(true);
    expect(result.hasTreatment).toBe(false);
    expect(result.hasFollowUp).toBe(true);
    expect(result.standardScore).toBeCloseTo(66.6, 1);
  });
});

describe("buildDischargeStdReport 构建报告", () => {
  // 手算：{standardScore:99.9, hasFollowUp:true}
  // 手算：standardScore=99.9 >= 90 → grade='完全标准化'
  it("{standardScore:99.9, hasFollowUp:true} → grade='完全标准化'", () => {
    const report = buildDischargeStdReport({ standardScore: 99.9, hasFollowUp: true });
    expect(report.standardScore).toBeCloseTo(99.9, 1);
    expect(report.grade).toBe("完全标准化");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-discharge-std auth:true", () => {
    const def = (emrTemplateDischargeStdV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-discharge-std");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

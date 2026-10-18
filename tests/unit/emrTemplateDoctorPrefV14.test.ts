/**
 * 健澜科技 jlmedaios - 模板医生个人偏好 V14 单测（M524-C）
 *
 * 测试 buildDoctorPref 构建偏好、getDoctorPreference 获取偏好、buildDoctorPrefReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDoctorPref,
  buildDoctorPrefReport,
  getDoctorPreference,
  type DoctorPrefInputV14,
} from "../../src/bff/aggregators/emrTemplateDoctorPrefV14Aggregator";
import { emrTemplateDoctorPrefV14Routes } from "../../src/bff/routes/emrTemplateDoctorPrefV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDoctorPref 构建偏好", () => {
  // 手算：doctorName='张医生', dept='心内科' → 正确构建
  it("doctorName='张医生', dept='心内科' → 正确构建", () => {
    const pref = buildDoctorPref("张医生", "心内科");
    expect(pref.doctorName).toBe("张医生");
    expect(pref.dept).toBe("心内科");
  });
});

describe("getDoctorPreference 有默认", () => {
  // 手算：input={doctorName:'张医生', frequentTemplates=['入院记录模板','出院小结模板'], defaultTemplate='入院记录模板'}
  // 手算：favoriteCount = frequentTemplates.length = 2
  // 手算：defaultTemplate='入院记录模板'非空 → hasDefault=true
  it("input={doctorName:'张医生', frequentTemplates=['入院记录模板','出院小结模板'], defaultTemplate='入院记录模板'} → favoriteCount=2, hasDefault=true", () => {
    const input: DoctorPrefInputV14 = {
      doctorName: "张医生",
      frequentTemplates: ["入院记录模板", "出院小结模板"],
      defaultTemplate: "入院记录模板",
    };
    const result = getDoctorPreference(input);
    expect(result.favoriteCount).toBe(2);
    expect(result.hasDefault).toBe(true);
  });
});

describe("getDoctorPreference 无默认", () => {
  // 手算：input={doctorName:'李医生', frequentTemplates=['手术记录模板'], defaultTemplate=''}
  // 手算：favoriteCount = frequentTemplates.length = 1
  // 手算：defaultTemplate=''空字符串 → hasDefault=false
  it("input={doctorName:'李医生', frequentTemplates=['手术记录模板'], defaultTemplate=''} → favoriteCount=1, hasDefault=false", () => {
    const input: DoctorPrefInputV14 = {
      doctorName: "李医生",
      frequentTemplates: ["手术记录模板"],
      defaultTemplate: "",
    };
    const result = getDoctorPreference(input);
    expect(result.favoriteCount).toBe(1);
    expect(result.hasDefault).toBe(false);
  });
});

describe("buildDoctorPrefReport 构建报告", () => {
  // 手算：{favoriteCount:2, hasDefault:true}
  // 手算：hasDefault=true → defaultHint='已设置默认模板'
  it("{favoriteCount:2, hasDefault:true} → defaultHint='已设置默认模板'", () => {
    const report = buildDoctorPrefReport({ favoriteCount: 2, hasDefault: true });
    expect(report.favoriteCount).toBe(2);
    expect(report.defaultHint).toBe("已设置默认模板");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-doctor-pref auth:true", () => {
    const def = (emrTemplateDoctorPrefV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-doctor-pref");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

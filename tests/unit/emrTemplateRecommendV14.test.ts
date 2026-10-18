/**
 * 健澜科技 jlmedaios - 病历模板智能推荐 V14 单测（M539-A）
 *
 * 测试 buildTemplateRecommend 构建模板推荐、recommendTemplate 模板推荐、buildTemplateRecommendReport 构建推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTemplateRecommend,
  buildTemplateRecommendReport,
  recommendTemplate,
  type TemplateRecommendInputV14,
} from "../../src/bff/aggregators/emrTemplateRecommendV14Aggregator";
import { emrTemplateRecommendV14Routes } from "../../src/bff/routes/emrTemplateRecommendV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTemplateRecommend 构建模板推荐", () => {
  // 手算：dept='心内科', doctorId='D001' → 正确构建
  it("dept='心内科', doctorId='D001' → 正确构建", () => {
    const base = buildTemplateRecommend("心内科", "D001");
    expect(base.dept).toBe("心内科");
    expect(base.doctorId).toBe("D001");
  });
});

describe("recommendTemplate 心内科入院", () => {
  // 手算：{dept='心内科', recordType='入院记录'}
  // 手算：recommended = dept==='心内科' && recordType==='入院记录' ? 2 个专科模板
  // 手算：recommended = ['心内科入院记录模板A','心内科入院记录模板B']
  // 手算：matchCount = recommended.length = 2
  it("{dept='心内科', recordType='入院记录'} → recommended=[2个], matchCount=2", () => {
    const input: TemplateRecommendInputV14 = { dept: "心内科", recordType: "入院记录" };
    const result = recommendTemplate(input);
    expect(result.recommended).toEqual(["心内科入院记录模板A", "心内科入院记录模板B"]);
    expect(result.matchCount).toBe(2);
  });
});

describe("recommendTemplate 通用", () => {
  // 手算：{dept='骨科', recordType='入院记录'}
  // 手算：recommended = 不满足心内科+入院条件 → ['通用入院记录模板']
  // 手算：matchCount = recommended.length = 1
  it("{dept='骨科', recordType='入院记录'} → recommended=[通用模板], matchCount=1", () => {
    const input: TemplateRecommendInputV14 = { dept: "骨科", recordType: "入院记录" };
    const result = recommendTemplate(input);
    expect(result.recommended).toEqual(["通用入院记录模板"]);
    expect(result.matchCount).toBe(1);
  });
});

describe("buildTemplateRecommendReport 构建推荐报告", () => {
  // 手算：{recommended=['心内科入院记录模板A','心内科入院记录模板B'], matchCount=2}
  // 手算：透传 recommended + matchCount
  it("{recommended=[2个], matchCount=2} → 正确返回（透传）", () => {
    const report = buildTemplateRecommendReport({
      recommended: ["心内科入院记录模板A", "心内科入院记录模板B"],
      matchCount: 2,
    });
    expect(report.recommended).toEqual(["心内科入院记录模板A", "心内科入院记录模板B"]);
    expect(report.matchCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-recommend auth:true", () => {
    const def = (emrTemplateRecommendV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-recommend");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

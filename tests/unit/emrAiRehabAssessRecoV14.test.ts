/**
 * 健澜科技 jlmedaios - 病历AI康复评估推荐 V14 单测（M563-A）
 *
 * 测试 buildAiRehabAssessReco 构建 AI 康复评估推荐、recommendRehabAssessByAi AI 康复评估推荐、buildAiRehabAssessRecoReport 构建康复评估推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRehabAssessReco,
  buildAiRehabAssessRecoReport,
  recommendRehabAssessByAi,
  type AiRehabAssessRecoInputV14,
} from "../../src/bff/aggregators/emrAiRehabAssessRecoV14Aggregator";
import { emrAiRehabAssessRecoV14Routes } from "../../src/bff/routes/emrAiRehabAssessRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRehabAssessReco 构建 AI 康复评估推荐", () => {
  // 手算：recordId='RECB074', dept='康复科' → 正确构建
  it("recordId='RECB074', dept='康复科' → 正确构建", () => {
    const base = buildAiRehabAssessReco("RECB074", "康复科");
    expect(base.recordId).toBe("RECB074");
    expect(base.dept).toBe("康复科");
  });
});

describe("recommendRehabAssessByAi 重度", () => {
  // 手算：{diagnosis='脑卒中后偏瘫', mobility='卧床'}
  // 手算：assessItems = '脑卒中后偏瘫'.includes('卒中')=true → ['肌力评估','平衡评估','言语评估']
  // 手算：rehabLevel = mobility==='卧床' → '重度'
  it("{diagnosis='脑卒中后偏瘫', mobility='卧床'} → assessItems 含肌力/平衡/言语, rehabLevel='重度'", () => {
    const input: AiRehabAssessRecoInputV14 = { diagnosis: "脑卒中后偏瘫", mobility: "卧床" };
    const result = recommendRehabAssessByAi(input);
    expect(result.assessItems).toContain("肌力评估");
    expect(result.assessItems).toContain("平衡评估");
    expect(result.assessItems).toContain("言语评估");
    expect(result.rehabLevel).toBe("重度");
  });
});

describe("recommendRehabAssessByAi 轻度", () => {
  // 手算：{diagnosis='膝关节骨关节炎', mobility='自主行走'}
  // 手算：assessItems = includes('卒中')=false, includes('骨折')=false → ['日常生活能力评估']
  // 手算：rehabLevel = mobility!=='卧床' && !=='辅助行走' → '轻度'
  it("{diagnosis='膝关节骨关节炎', mobility='自主行走'} → assessItems 含日常生活能力评估, rehabLevel='轻度'", () => {
    const input: AiRehabAssessRecoInputV14 = { diagnosis: "膝关节骨关节炎", mobility: "自主行走" };
    const result = recommendRehabAssessByAi(input);
    expect(result.assessItems).toContain("日常生活能力评估");
    expect(result.rehabLevel).toBe("轻度");
  });
});

describe("buildAiRehabAssessRecoReport 构建康复评估推荐报告", () => {
  // 手算：{assessItems=['肌力评估'], rehabLevel='重度'}
  // 手算：透传 assessItems + rehabLevel
  it("{assessItems=['肌力评估'], rehabLevel='重度'} → 正确返回（透传）", () => {
    const report = buildAiRehabAssessRecoReport({ assessItems: ["肌力评估"], rehabLevel: "重度" });
    expect(report.assessItems).toEqual(["肌力评估"]);
    expect(report.rehabLevel).toBe("重度");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-rehab-assess-reco auth:true", () => {
    const def = (emrAiRehabAssessRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-rehab-assess-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

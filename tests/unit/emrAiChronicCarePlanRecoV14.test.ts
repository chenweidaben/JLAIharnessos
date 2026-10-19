/**
 * 健澜科技 jlmedaios - 病历AI慢病管理计划推荐 V14 单测（M563-D，M563 收官）
 *
 * 测试 buildAiChronicCarePlanReco 构建 AI 慢病管理计划推荐、recommendChronicCarePlanByAi AI 慢病管理计划推荐、buildAiChronicCarePlanRecoReport 构建慢病管理计划推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiChronicCarePlanReco,
  buildAiChronicCarePlanRecoReport,
  recommendChronicCarePlanByAi,
  type AiChronicCarePlanRecoInputV14,
} from "../../src/bff/aggregators/emrAiChronicCarePlanRecoV14Aggregator";
import { emrAiChronicCarePlanRecoV14Routes } from "../../src/bff/routes/emrAiChronicCarePlanRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiChronicCarePlanReco 构建 AI 慢病管理计划推荐", () => {
  // 手算：recordId='RECB077', dept='全科' → 正确构建
  it("recordId='RECB077', dept='全科' → 正确构建", () => {
    const base = buildAiChronicCarePlanReco("RECB077", "全科");
    expect(base.recordId).toBe("RECB077");
    expect(base.dept).toBe("全科");
  });
});

describe("recommendChronicCarePlanByAi 高血压控制不佳", () => {
  // 手算：{disease='原发性高血压', controlStatus='控制不佳'}
  // 手算：planName = '原发性高血压'.includes('高血压')=true → '高血压慢病管理计划'
  // 手算：monitorFrequency = controlStatus==='控制不佳' → '每周监测'
  it("{disease='原发性高血压', controlStatus='控制不佳'} → planName='高血压慢病管理计划', monitorFrequency='每周监测'", () => {
    const input: AiChronicCarePlanRecoInputV14 = { disease: "原发性高血压", controlStatus: "控制不佳" };
    const result = recommendChronicCarePlanByAi(input);
    expect(result.planName).toBe("高血压慢病管理计划");
    expect(result.monitorFrequency).toBe("每周监测");
  });
});

describe("recommendChronicCarePlanByAi 糖尿病控制良好", () => {
  // 手算：{disease='2型糖尿病', controlStatus='控制良好'}
  // 手算：planName = includes('高血压')=false, includes('糖尿病')=true → '糖尿病慢病管理计划'
  // 手算：monitorFrequency = controlStatus!=='控制不佳' && !=='控制一般' → '每月监测'
  it("{disease='2型糖尿病', controlStatus='控制良好'} → planName='糖尿病慢病管理计划', monitorFrequency='每月监测'", () => {
    const input: AiChronicCarePlanRecoInputV14 = { disease: "2型糖尿病", controlStatus: "控制良好" };
    const result = recommendChronicCarePlanByAi(input);
    expect(result.planName).toBe("糖尿病慢病管理计划");
    expect(result.monitorFrequency).toBe("每月监测");
  });
});

describe("buildAiChronicCarePlanRecoReport 构建慢病管理计划推荐报告", () => {
  // 手算：{planName='高血压慢病管理计划', monitorFrequency='每周监测'}
  // 手算：透传 planName + monitorFrequency
  it("{planName='高血压慢病管理计划', monitorFrequency='每周监测'} → 正确返回（透传）", () => {
    const report = buildAiChronicCarePlanRecoReport({ planName: "高血压慢病管理计划", monitorFrequency: "每周监测" });
    expect(report.planName).toBe("高血压慢病管理计划");
    expect(report.monitorFrequency).toBe("每周监测");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-chronic-care-plan-reco auth:true", () => {
    const def = (emrAiChronicCarePlanRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-chronic-care-plan-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

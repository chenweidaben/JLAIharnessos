/**
 * 健澜科技 jlmedaios - 病历AI康复训练方案推荐 V14 单测（M563-B）
 *
 * 测试 buildAiRehabPlanReco 构建 AI 康复训练方案推荐、recommendRehabPlanByAi AI 康复训练方案推荐、buildAiRehabPlanRecoReport 构建康复训练方案推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRehabPlanReco,
  buildAiRehabPlanRecoReport,
  recommendRehabPlanByAi,
  type AiRehabPlanRecoInputV14,
} from "../../src/bff/aggregators/emrAiRehabPlanRecoV14Aggregator";
import { emrAiRehabPlanRecoV14Routes } from "../../src/bff/routes/emrAiRehabPlanRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRehabPlanReco 构建 AI 康复训练方案推荐", () => {
  // 手算：recordId='RECB075', dept='康复科' → 正确构建
  it("recordId='RECB075', dept='康复科' → 正确构建", () => {
    const base = buildAiRehabPlanReco("RECB075", "康复科");
    expect(base.recordId).toBe("RECB075");
    expect(base.dept).toBe("康复科");
  });
});

describe("recommendRehabPlanByAi 重度卒中", () => {
  // 手算：{diagnosis='脑卒中后偏瘫', rehabLevel='重度'}
  // 手算：planName = '脑卒中后偏瘫'.includes('卒中')=true → '卒中康复训练方案'
  // 手算：frequency = rehabLevel==='重度' → '每日2次'
  it("{diagnosis='脑卒中后偏瘫', rehabLevel='重度'} → planName='卒中康复训练方案', frequency='每日2次'", () => {
    const input: AiRehabPlanRecoInputV14 = { diagnosis: "脑卒中后偏瘫", rehabLevel: "重度" };
    const result = recommendRehabPlanByAi(input);
    expect(result.planName).toBe("卒中康复训练方案");
    expect(result.frequency).toBe("每日2次");
  });
});

describe("recommendRehabPlanByAi 轻度常规", () => {
  // 手算：{diagnosis='膝关节骨关节炎', rehabLevel='轻度'}
  // 手算：planName = includes('卒中')=false, includes('骨折')=false → '常规康复训练方案'
  // 手算：frequency = rehabLevel!=='重度' && !=='中度' → '每周3次'
  it("{diagnosis='膝关节骨关节炎', rehabLevel='轻度'} → planName='常规康复训练方案', frequency='每周3次'", () => {
    const input: AiRehabPlanRecoInputV14 = { diagnosis: "膝关节骨关节炎", rehabLevel: "轻度" };
    const result = recommendRehabPlanByAi(input);
    expect(result.planName).toBe("常规康复训练方案");
    expect(result.frequency).toBe("每周3次");
  });
});

describe("buildAiRehabPlanRecoReport 构建康复训练方案推荐报告", () => {
  // 手算：{planName='卒中康复训练方案', frequency='每日2次'}
  // 手算：透传 planName + frequency
  it("{planName='卒中康复训练方案', frequency='每日2次'} → 正确返回（透传）", () => {
    const report = buildAiRehabPlanRecoReport({ planName: "卒中康复训练方案", frequency: "每日2次" });
    expect(report.planName).toBe("卒中康复训练方案");
    expect(report.frequency).toBe("每日2次");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-rehab-plan-reco auth:true", () => {
    const def = (emrAiRehabPlanRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-rehab-plan-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

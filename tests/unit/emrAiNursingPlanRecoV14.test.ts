/**
 * 健澜科技 jlmedaios - 病历AI护理计划推荐 V14 单测（M557-B）
 *
 * 测试 buildAiNursingPlanReco 构建 AI 护理计划推荐、recommendNursingPlanByAi AI 护理计划推荐、buildAiNursingPlanRecoReport 构建护理计划推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiNursingPlanReco,
  buildAiNursingPlanRecoReport,
  recommendNursingPlanByAi,
  type AiNursingPlanRecoInputV14,
} from "../../src/bff/aggregators/emrAiNursingPlanRecoV14Aggregator";
import { emrAiNursingPlanRecoV14Routes } from "../../src/bff/routes/emrAiNursingPlanRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiNursingPlanReco 构建 AI 护理计划推荐", () => {
  // 手算：recordId='RECB050', dept='护理部' → 正确构建
  it("recordId='RECB050', dept='护理部' → 正确构建", () => {
    const base = buildAiNursingPlanReco("RECB050", "护理部");
    expect(base.recordId).toBe("RECB050");
    expect(base.dept).toBe("护理部");
  });
});

describe("recommendNursingPlanByAi 老年心梗", () => {
  // 手算：{diagnosis='急性心梗', patientAge=75}
  // 手算：diagnosis.includes('心梗')=true → planName='心梗术后护理计划'
  // 手算：patientAge=75 >= 70 → frequency='每日4次'
  it("{diagnosis='急性心梗', patientAge=75} → planName='心梗术后护理计划', frequency='每日4次'", () => {
    const input: AiNursingPlanRecoInputV14 = { diagnosis: "急性心梗", patientAge: 75 };
    const result = recommendNursingPlanByAi(input);
    expect(result.planName).toBe("心梗术后护理计划");
    expect(result.frequency).toBe("每日4次");
  });
});

describe("recommendNursingPlanByAi 普通", () => {
  // 手算：{diagnosis='上呼吸道感染', patientAge=30}
  // 手算：不含心梗/肺炎 → planName='常规护理计划'
  // 手算：patientAge=30 < 70 → frequency='每日2次'
  it("{diagnosis='上呼吸道感染', patientAge=30} → planName='常规护理计划', frequency='每日2次'", () => {
    const input: AiNursingPlanRecoInputV14 = { diagnosis: "上呼吸道感染", patientAge: 30 };
    const result = recommendNursingPlanByAi(input);
    expect(result.planName).toBe("常规护理计划");
    expect(result.frequency).toBe("每日2次");
  });
});

describe("buildAiNursingPlanRecoReport 构建护理计划推荐报告", () => {
  // 手算：{planName='心梗术后护理计划', frequency='每日4次'}
  // 手算：透传 planName + frequency
  it("{planName='心梗术后护理计划', frequency='每日4次'} → 正确返回（透传）", () => {
    const report = buildAiNursingPlanRecoReport({ planName: "心梗术后护理计划", frequency: "每日4次" });
    expect(report.planName).toBe("心梗术后护理计划");
    expect(report.frequency).toBe("每日4次");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-nursing-plan-reco auth:true", () => {
    const def = (emrAiNursingPlanRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-nursing-plan-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

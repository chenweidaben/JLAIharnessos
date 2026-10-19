/**
 * 健澜科技 jlmedaios - 病历AI诊疗方案推荐 V14 单测（M554-C）
 *
 * 测试 buildAiTreatmentPlanReco 构建 AI 诊疗方案推荐、recommendTreatmentPlanByAi AI 诊疗方案推荐、buildAiTreatmentPlanRecoReport 构建诊疗方案推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiTreatmentPlanReco,
  buildAiTreatmentPlanRecoReport,
  recommendTreatmentPlanByAi,
  type AiTreatmentPlanRecoInputV14,
} from "../../src/bff/aggregators/emrAiTreatmentPlanRecoV14Aggregator";
import { emrAiTreatmentPlanRecoV14Routes } from "../../src/bff/routes/emrAiTreatmentPlanRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiTreatmentPlanReco 构建 AI 诊疗方案推荐", () => {
  // 手算：recordId='RECB039', dept='心内科' → 正确构建
  it("recordId='RECB039', dept='心内科' → 正确构建", () => {
    const base = buildAiTreatmentPlanReco("RECB039", "心内科");
    expect(base.recordId).toBe("RECB039");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendTreatmentPlanByAi 介入", () => {
  // 手算：{diagnosis='急性心梗', severity='危重'}
  // 手算：diagnosis.includes('心梗')=true, severity='危重' → planName='介入治疗方案'
  // 手算：planName.includes('介入')=true → expectedDays=10
  it("{diagnosis='急性心梗', severity='危重'} → planName='介入治疗方案', expectedDays=10", () => {
    const input: AiTreatmentPlanRecoInputV14 = { diagnosis: "急性心梗", severity: "危重" };
    const result = recommendTreatmentPlanByAi(input);
    expect(result.planName).toBe("介入治疗方案");
    expect(result.expectedDays).toBe(10);
  });
});

describe("recommendTreatmentPlanByAi 口服", () => {
  // 手算：{diagnosis='肺炎', severity='普通'}
  // 手算：diagnosis.includes('肺炎')=true, severity!=='危重' → planName='口服抗生素方案'
  // 手算：planName.includes('口服')=true → expectedDays=5
  it("{diagnosis='肺炎', severity='普通'} → planName='口服抗生素方案', expectedDays=5", () => {
    const input: AiTreatmentPlanRecoInputV14 = { diagnosis: "肺炎", severity: "普通" };
    const result = recommendTreatmentPlanByAi(input);
    expect(result.planName).toBe("口服抗生素方案");
    expect(result.expectedDays).toBe(5);
  });
});

describe("buildAiTreatmentPlanRecoReport 构建诊疗方案推荐报告", () => {
  // 手算：{planName='介入治疗方案', expectedDays=10}
  // 手算：透传 planName + expectedDays
  it("{planName='介入治疗方案', expectedDays=10} → 正确返回（透传）", () => {
    const report = buildAiTreatmentPlanRecoReport({ planName: "介入治疗方案", expectedDays: 10 });
    expect(report.planName).toBe("介入治疗方案");
    expect(report.expectedDays).toBe(10);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-treatment-plan-reco auth:true", () => {
    const def = (emrAiTreatmentPlanRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-treatment-plan-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

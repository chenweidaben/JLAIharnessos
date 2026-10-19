/**
 * 健澜科技 jlmedaios - 病历AI手术方案推荐 V14 单测（M562-B）
 *
 * 测试 buildAiSurgeryPlanReco 构建 AI 手术方案推荐、recommendSurgeryPlanByAi AI 手术方案推荐、buildAiSurgeryPlanRecoReport 构建手术方案推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiSurgeryPlanReco,
  buildAiSurgeryPlanRecoReport,
  recommendSurgeryPlanByAi,
  type AiSurgeryPlanRecoInputV14,
} from "../../src/bff/aggregators/emrAiSurgeryPlanRecoV14Aggregator";
import { emrAiSurgeryPlanRecoV14Routes } from "../../src/bff/routes/emrAiSurgeryPlanRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiSurgeryPlanReco 构建 AI 手术方案推荐", () => {
  // 手算：recordId='RECB071', dept='外科' → 正确构建
  it("recordId='RECB071', dept='外科' → 正确构建", () => {
    const base = buildAiSurgeryPlanReco("RECB071", "外科");
    expect(base.recordId).toBe("RECB071");
    expect(base.dept).toBe("外科");
  });
});

describe("recommendSurgeryPlanByAi 危重", () => {
  // 手算：{diagnosis='急性阑尾炎', severity='危重'}
  // 手算：planName = '急性阑尾炎'.includes('阑尾炎')=true → '腹腔镜阑尾切除术'
  // 手算：anesthesiaType = severity==='危重' → '全身麻醉'
  it("{diagnosis='急性阑尾炎', severity='危重'} → planName='腹腔镜阑尾切除术', anesthesiaType='全身麻醉'", () => {
    const input: AiSurgeryPlanRecoInputV14 = { diagnosis: "急性阑尾炎", severity: "危重" };
    const result = recommendSurgeryPlanByAi(input);
    expect(result.planName).toBe("腹腔镜阑尾切除术");
    expect(result.anesthesiaType).toBe("全身麻醉");
  });
});

describe("recommendSurgeryPlanByAi 普通", () => {
  // 手算：{diagnosis='腹股沟疝', severity='普通'}
  // 手算：planName = includes('阑尾炎')=false, includes('胆囊炎')=false → '开腹探查术'
  // 手算：anesthesiaType = severity!=='危重' → '硬膜外麻醉'
  it("{diagnosis='腹股沟疝', severity='普通'} → planName='开腹探查术', anesthesiaType='硬膜外麻醉'", () => {
    const input: AiSurgeryPlanRecoInputV14 = { diagnosis: "腹股沟疝", severity: "普通" };
    const result = recommendSurgeryPlanByAi(input);
    expect(result.planName).toBe("开腹探查术");
    expect(result.anesthesiaType).toBe("硬膜外麻醉");
  });
});

describe("buildAiSurgeryPlanRecoReport 构建手术方案推荐报告", () => {
  // 手算：{planName='腹腔镜阑尾切除术', anesthesiaType='全身麻醉'}
  // 手算：透传 planName + anesthesiaType
  it("{planName='腹腔镜阑尾切除术', anesthesiaType='全身麻醉'} → 正确返回（透传）", () => {
    const report = buildAiSurgeryPlanRecoReport({ planName: "腹腔镜阑尾切除术", anesthesiaType: "全身麻醉" });
    expect(report.planName).toBe("腹腔镜阑尾切除术");
    expect(report.anesthesiaType).toBe("全身麻醉");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-surgery-plan-reco auth:true", () => {
    const def = (emrAiSurgeryPlanRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-surgery-plan-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

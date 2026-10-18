/**
 * 健澜科技 jlmedaios - 病历AI随访计划推荐 V14 单测（M546-D，M546 收官）
 *
 * 测试 buildAiFollowupPlanReco 构建 AI 随访计划推荐、recommendFollowupPlanByAi AI 随访计划推荐、buildAiFollowupPlanRecoReport 构建随访报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiFollowupPlanReco,
  buildAiFollowupPlanRecoReport,
  recommendFollowupPlanByAi,
  type AiFollowupPlanRecoInputV14,
} from "../../src/bff/aggregators/emrAiFollowupPlanRecoV14Aggregator";
import { emrAiFollowupPlanRecoV14Routes } from "../../src/bff/routes/emrAiFollowupPlanRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiFollowupPlanReco 构建 AI 随访计划推荐", () => {
  // 手算：recordId='RECB008', dept='心内科' → 正确构建
  it("recordId='RECB008', dept='心内科' → 正确构建", () => {
    const base = buildAiFollowupPlanReco("RECB008", "心内科");
    expect(base.recordId).toBe("RECB008");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendFollowupPlanByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗', daysAfterDischarge=7}
  // 手算：diagnosis.includes('心梗') → true → frequency='每周1次'
  // 手算：nextVisit = Math.ceil(7 * 1.5) = Math.ceil(10.5) = 11
  it("{diagnosis='急性心梗', daysAfterDischarge=7} → frequency='每周1次', nextVisit=11", () => {
    const input: AiFollowupPlanRecoInputV14 = { diagnosis: "急性心梗", daysAfterDischarge: 7 };
    const result = recommendFollowupPlanByAi(input);
    expect(result.frequency).toBe("每周1次");
    expect(result.nextVisit).toBe(11);
  });
});

describe("recommendFollowupPlanByAi 一般", () => {
  // 手算：{diagnosis='上感', daysAfterDischarge=5}
  // 手算：diagnosis.includes('心梗') → false → frequency='每月1次'
  // 手算：nextVisit = Math.ceil(5 * 1.5) = Math.ceil(7.5) = 8
  it("{diagnosis='上感', daysAfterDischarge=5} → frequency='每月1次', nextVisit=8", () => {
    const input: AiFollowupPlanRecoInputV14 = { diagnosis: "上感", daysAfterDischarge: 5 };
    const result = recommendFollowupPlanByAi(input);
    expect(result.frequency).toBe("每月1次");
    expect(result.nextVisit).toBe(8);
  });
});

describe("buildAiFollowupPlanRecoReport 构建随访报告", () => {
  // 手算：{frequency='每周1次', nextVisit=11}
  // 手算：透传 frequency + nextVisit
  it("{frequency='每周1次', nextVisit=11} → 正确返回（透传）", () => {
    const report = buildAiFollowupPlanRecoReport({ frequency: "每周1次", nextVisit: 11 });
    expect(report.frequency).toBe("每周1次");
    expect(report.nextVisit).toBe(11);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-followup-plan-reco auth:true", () => {
    const def = (emrAiFollowupPlanRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-followup-plan-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

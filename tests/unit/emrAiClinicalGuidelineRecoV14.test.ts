/**
 * 健澜科技 jlmedaios - 病历AI临床指南推荐 V14 单测（M554-D，M554 收官）
 *
 * 测试 buildAiClinicalGuidelineReco 构建 AI 临床指南推荐、recommendClinicalGuidelineByAi AI 临床指南推荐、buildAiClinicalGuidelineRecoReport 构建临床指南推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiClinicalGuidelineReco,
  buildAiClinicalGuidelineRecoReport,
  recommendClinicalGuidelineByAi,
  type AiClinicalGuidelineRecoInputV14,
} from "../../src/bff/aggregators/emrAiClinicalGuidelineRecoV14Aggregator";
import { emrAiClinicalGuidelineRecoV14Routes } from "../../src/bff/routes/emrAiClinicalGuidelineRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiClinicalGuidelineReco 构建 AI 临床指南推荐", () => {
  // 手算：recordId='RECB040', dept='心内科' → 正确构建
  it("recordId='RECB040', dept='心内科' → 正确构建", () => {
    const base = buildAiClinicalGuidelineReco("RECB040", "心内科");
    expect(base.recordId).toBe("RECB040");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendClinicalGuidelineByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗', specialty='心血管内科'}
  // 手算：diagnosis.includes('心梗')=true → guidelineName='急性ST段抬高型心梗诊疗指南'
  // 手算：version='2024版'（统一版本）
  it("{diagnosis='急性心梗', specialty='心血管内科'} → guidelineName='急性ST段抬高型心梗诊疗指南', version='2024版'", () => {
    const input: AiClinicalGuidelineRecoInputV14 = { diagnosis: "急性心梗", specialty: "心血管内科" };
    const result = recommendClinicalGuidelineByAi(input);
    expect(result.guidelineName).toBe("急性ST段抬高型心梗诊疗指南");
    expect(result.version).toBe("2024版");
  });
});

describe("recommendClinicalGuidelineByAi 一般", () => {
  // 手算：{diagnosis='上呼吸道感染', specialty='呼吸内科'}
  // 手算：不含心梗/肺炎 → guidelineName='常见病临床诊疗指南'
  // 手算：version='2024版'（统一版本）
  it("{diagnosis='上呼吸道感染', specialty='呼吸内科'} → guidelineName='常见病临床诊疗指南', version='2024版'", () => {
    const input: AiClinicalGuidelineRecoInputV14 = { diagnosis: "上呼吸道感染", specialty: "呼吸内科" };
    const result = recommendClinicalGuidelineByAi(input);
    expect(result.guidelineName).toBe("常见病临床诊疗指南");
    expect(result.version).toBe("2024版");
  });
});

describe("buildAiClinicalGuidelineRecoReport 构建临床指南推荐报告", () => {
  // 手算：{guidelineName='急性ST段抬高型心梗诊疗指南', version='2024版'}
  // 手算：透传 guidelineName + version
  it("{guidelineName='急性ST段抬高型心梗诊疗指南', version='2024版'} → 正确返回（透传）", () => {
    const report = buildAiClinicalGuidelineRecoReport({ guidelineName: "急性ST段抬高型心梗诊疗指南", version: "2024版" });
    expect(report.guidelineName).toBe("急性ST段抬高型心梗诊疗指南");
    expect(report.version).toBe("2024版");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-clinical-guideline-reco auth:true", () => {
    const def = (emrAiClinicalGuidelineRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-clinical-guideline-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

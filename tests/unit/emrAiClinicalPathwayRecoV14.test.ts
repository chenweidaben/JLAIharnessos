/**
 * 健澜科技 jlmedaios - 病历AI临床路径推荐 V14 单测（M554-A）
 *
 * 测试 buildAiClinicalPathwayReco 构建 AI 临床路径推荐、recommendClinicalPathwayByAi AI 临床路径推荐、buildAiClinicalPathwayRecoReport 构建临床路径推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiClinicalPathwayReco,
  buildAiClinicalPathwayRecoReport,
  recommendClinicalPathwayByAi,
  type AiClinicalPathwayRecoInputV14,
} from "../../src/bff/aggregators/emrAiClinicalPathwayRecoV14Aggregator";
import { emrAiClinicalPathwayRecoV14Routes } from "../../src/bff/routes/emrAiClinicalPathwayRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiClinicalPathwayReco 构建 AI 临床路径推荐", () => {
  // 手算：recordId='RECB037', dept='心内科' → 正确构建
  it("recordId='RECB037', dept='心内科' → 正确构建", () => {
    const base = buildAiClinicalPathwayReco("RECB037", "心内科");
    expect(base.recordId).toBe("RECB037");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendClinicalPathwayByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗', age=65}
  // 手算：diagnosis.includes('心梗')=true → pathwayName='急性心梗临床路径'
  // 手算：pathwayName.includes('心梗')=true → days=7
  it("{diagnosis='急性心梗', age=65} → pathwayName='急性心梗临床路径', days=7", () => {
    const input: AiClinicalPathwayRecoInputV14 = { diagnosis: "急性心梗", age: 65 };
    const result = recommendClinicalPathwayByAi(input);
    expect(result.pathwayName).toBe("急性心梗临床路径");
    expect(result.days).toBe(7);
  });
});

describe("recommendClinicalPathwayByAi 一般", () => {
  // 手算：{diagnosis='上呼吸道感染', age=30}
  // 手算：不含心梗/肺炎 → pathwayName='常见病诊疗路径'
  // 手算：pathwayName 不含心梗/肺炎 → days=3
  it("{diagnosis='上呼吸道感染', age=30} → pathwayName='常见病诊疗路径', days=3", () => {
    const input: AiClinicalPathwayRecoInputV14 = { diagnosis: "上呼吸道感染", age: 30 };
    const result = recommendClinicalPathwayByAi(input);
    expect(result.pathwayName).toBe("常见病诊疗路径");
    expect(result.days).toBe(3);
  });
});

describe("buildAiClinicalPathwayRecoReport 构建临床路径推荐报告", () => {
  // 手算：{pathwayName='急性心梗临床路径', days=7}
  // 手算：透传 pathwayName + days
  it("{pathwayName='急性心梗临床路径', days=7} → 正确返回（透传）", () => {
    const report = buildAiClinicalPathwayRecoReport({ pathwayName: "急性心梗临床路径", days: 7 });
    expect(report.pathwayName).toBe("急性心梗临床路径");
    expect(report.days).toBe(7);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-clinical-pathway-reco auth:true", () => {
    const def = (emrAiClinicalPathwayRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-clinical-pathway-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

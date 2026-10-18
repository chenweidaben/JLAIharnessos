/**
 * 健澜科技 jlmedaios - 病历AI临床路径推荐 V14 单测（M546-A）
 *
 * 测试 buildAiPathwayReco 构建 AI 临床路径推荐、recommendPathwayByAi AI 临床路径推荐、buildAiPathwayRecoReport 构建路径报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPathwayReco,
  buildAiPathwayRecoReport,
  recommendPathwayByAi,
  type AiPathwayRecoInputV14,
} from "../../src/bff/aggregators/emrAiPathwayRecoV14Aggregator";
import { emrAiPathwayRecoV14Routes } from "../../src/bff/routes/emrAiPathwayRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPathwayReco 构建 AI 临床路径推荐", () => {
  // 手算：recordId='RECB005', dept='心内科' → 正确构建
  it("recordId='RECB005', dept='心内科' → 正确构建", () => {
    const base = buildAiPathwayReco("RECB005", "心内科");
    expect(base.recordId).toBe("RECB005");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendPathwayByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗'}
  // 手算：diagnosis.includes('心梗') → true → pathwayName='急性心梗临床路径'
  // 手算：pathwayName.includes('心梗') → days=7
  it("{diagnosis='急性心梗'} → pathwayName='急性心梗临床路径', days=7", () => {
    const input: AiPathwayRecoInputV14 = { diagnosis: "急性心梗" };
    const result = recommendPathwayByAi(input);
    expect(result.pathwayName).toBe("急性心梗临床路径");
    expect(result.days).toBe(7);
  });
});

describe("recommendPathwayByAi 一般", () => {
  // 手算：{diagnosis='上呼吸道感染'}
  // 手算：diagnosis.includes('心梗') → false → pathwayName='普通常见病路径'
  // 手算：pathwayName.includes('心梗') → false → days=5
  it("{diagnosis='上呼吸道感染'} → pathwayName='普通常见病路径', days=5", () => {
    const input: AiPathwayRecoInputV14 = { diagnosis: "上呼吸道感染" };
    const result = recommendPathwayByAi(input);
    expect(result.pathwayName).toBe("普通常见病路径");
    expect(result.days).toBe(5);
  });
});

describe("buildAiPathwayRecoReport 构建路径报告", () => {
  // 手算：{pathwayName='急性心梗临床路径', days=7}
  // 手算：透传 pathwayName + days
  it("{pathwayName='急性心梗临床路径', days=7} → 正确返回（透传）", () => {
    const report = buildAiPathwayRecoReport({ pathwayName: "急性心梗临床路径", days: 7 });
    expect(report.pathwayName).toBe("急性心梗临床路径");
    expect(report.days).toBe(7);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-pathway-reco auth:true", () => {
    const def = (emrAiPathwayRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-pathway-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

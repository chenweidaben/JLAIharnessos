/**
 * 健澜科技 jlmedaios - 病历AI ICD 编码推荐 V14 单测（M551-B）
 *
 * 测试 buildAiIcdReco 构建 AI ICD 编码推荐、recommendIcdByAi AI ICD 编码推荐、buildAiIcdRecoReport 构建 ICD 编码推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiIcdReco,
  buildAiIcdRecoReport,
  recommendIcdByAi,
  type AiIcdRecoInputV14,
} from "../../src/bff/aggregators/emrAiIcdRecoV14Aggregator";
import { emrAiIcdRecoV14Routes } from "../../src/bff/routes/emrAiIcdRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiIcdReco 构建 AI ICD 编码推荐", () => {
  // 手算：recordId='RECB026', dept='呼吸科' → 正确构建
  it("recordId='RECB026', dept='呼吸科' → 正确构建", () => {
    const base = buildAiIcdReco("RECB026", "呼吸科");
    expect(base.recordId).toBe("RECB026");
    expect(base.dept).toBe("呼吸科");
  });
});

describe("recommendIcdByAi 肺炎", () => {
  // 手算：{diagnosis='社区获得性肺炎'}
  // 手算：diagnosis.includes('肺炎')=true → icdCode='J18.9'
  // 手算：icdCode='J18.9' !== 'R00.0' → confidence=0.92
  it("{diagnosis='社区获得性肺炎'} → icdCode='J18.9', confidence=0.92", () => {
    const input: AiIcdRecoInputV14 = { diagnosis: "社区获得性肺炎" };
    const result = recommendIcdByAi(input);
    expect(result.icdCode).toBe("J18.9");
    expect(result.confidence).toBe(0.92);
  });
});

describe("recommendIcdByAi 一般", () => {
  // 手算：{diagnosis='头晕待查'}
  // 手算：不含肺炎/心梗 → icdCode='R00.0'
  // 手算：icdCode='R00.0' → confidence=0.6
  it("{diagnosis='头晕待查'} → icdCode='R00.0', confidence=0.6", () => {
    const input: AiIcdRecoInputV14 = { diagnosis: "头晕待查" };
    const result = recommendIcdByAi(input);
    expect(result.icdCode).toBe("R00.0");
    expect(result.confidence).toBe(0.6);
  });
});

describe("buildAiIcdRecoReport 构建 ICD 编码推荐报告", () => {
  // 手算：{icdCode='J18.9', confidence=0.92}
  // 手算：透传 icdCode + confidence
  it("{icdCode='J18.9', confidence=0.92} → 正确返回（透传）", () => {
    const report = buildAiIcdRecoReport({ icdCode: "J18.9", confidence: 0.92 });
    expect(report.icdCode).toBe("J18.9");
    expect(report.confidence).toBe(0.92);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-icd-reco auth:true", () => {
    const def = (emrAiIcdRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-icd-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

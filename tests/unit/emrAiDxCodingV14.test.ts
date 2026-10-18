/**
 * 健澜科技 jlmedaios - 病历AI诊断编码建议 V14 单测（M544-A）
 *
 * 测试 buildAiDxCoding 构建 AI 诊断编码、suggestDxCodingByAi AI 诊断编码建议、buildAiDxCodingReport 构建编码报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDxCoding,
  buildAiDxCodingReport,
  suggestDxCodingByAi,
  type AiDxCodingInputV14,
} from "../../src/bff/aggregators/emrAiDxCodingV14Aggregator";
import { emrAiDxCodingV14Routes } from "../../src/bff/routes/emrAiDxCodingV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDxCoding 构建 AI 诊断编码", () => {
  // 手算：recordId='RECA001', dept='呼吸科' → 正确构建
  it("recordId='RECA001', dept='呼吸科' → 正确构建", () => {
    const base = buildAiDxCoding("RECA001", "呼吸科");
    expect(base.recordId).toBe("RECA001");
    expect(base.dept).toBe("呼吸科");
  });
});

describe("suggestDxCodingByAi 肺炎", () => {
  // 手算：{diagnosis='社区获得性肺炎'}
  // 手算：diagnosis.includes('肺炎') → true → icdCode='J18.900'
  // 手算：confidence = 0.92
  it("{diagnosis='社区获得性肺炎'} → icdCode='J18.900', confidence=0.92", () => {
    const input: AiDxCodingInputV14 = { diagnosis: "社区获得性肺炎" };
    const result = suggestDxCodingByAi(input);
    expect(result.icdCode).toBe("J18.900");
    expect(result.confidence).toBe(0.92);
  });
});

describe("suggestDxCodingByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗'}
  // 手算：diagnosis.includes('肺炎') → false；diagnosis.includes('心梗') → true → icdCode='I21.400'
  // 手算：confidence = 0.92
  it("{diagnosis='急性心梗'} → icdCode='I21.400', confidence=0.92", () => {
    const input: AiDxCodingInputV14 = { diagnosis: "急性心梗" };
    const result = suggestDxCodingByAi(input);
    expect(result.icdCode).toBe("I21.400");
    expect(result.confidence).toBe(0.92);
  });
});

describe("buildAiDxCodingReport 构建编码报告", () => {
  // 手算：{icdCode='J18.900', confidence=0.92}
  // 手算：透传 icdCode + confidence
  it("{icdCode='J18.900', confidence=0.92} → 正确返回（透传）", () => {
    const report = buildAiDxCodingReport({ icdCode: "J18.900", confidence: 0.92 });
    expect(report.icdCode).toBe("J18.900");
    expect(report.confidence).toBe(0.92);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-dx-coding auth:true", () => {
    const def = (emrAiDxCodingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-dx-coding");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

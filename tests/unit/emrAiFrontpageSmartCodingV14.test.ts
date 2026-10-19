/**
 * 健澜科技 jlmedaios - 病历AI病案首页智能编码 V14 单测（M556-A）
 *
 * 测试 buildAiFrontpageSmartCoding 构建 AI 病案首页智能编码、codeFrontpageByAi AI 病案首页智能编码、buildAiFrontpageSmartCodingReport 构建首页智能编码报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiFrontpageSmartCoding,
  buildAiFrontpageSmartCodingReport,
  codeFrontpageByAi,
  type AiFrontpageSmartCodingInputV14,
} from "../../src/bff/aggregators/emrAiFrontpageSmartCodingV14Aggregator";
import { emrAiFrontpageSmartCodingV14Routes } from "../../src/bff/routes/emrAiFrontpageSmartCodingV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiFrontpageSmartCoding 构建 AI 病案首页智能编码", () => {
  // 手算：recordId='RECB045', dept='病案室' → 正确构建
  it("recordId='RECB045', dept='病案室' → 正确构建", () => {
    const base = buildAiFrontpageSmartCoding("RECB045", "病案室");
    expect(base.recordId).toBe("RECB045");
    expect(base.dept).toBe("病案室");
  });
});

describe("codeFrontpageByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗'}
  // 手算：diagnosis.includes('心梗')=true → icdCode='I21.4'
  // 手算：diagnosisName = diagnosis = '急性心梗'
  it("{diagnosis='急性心梗'} → icdCode='I21.4', diagnosisName='急性心梗'", () => {
    const input: AiFrontpageSmartCodingInputV14 = { diagnosis: "急性心梗" };
    const result = codeFrontpageByAi(input);
    expect(result.icdCode).toBe("I21.4");
    expect(result.diagnosisName).toBe("急性心梗");
  });
});

describe("codeFrontpageByAi 一般", () => {
  // 手算：{diagnosis='上呼吸道感染'}
  // 手算：不含心梗/肺炎 → icdCode='R69.X'
  // 手算：diagnosisName = diagnosis = '上呼吸道感染'
  it("{diagnosis='上呼吸道感染'} → icdCode='R69.X', diagnosisName='上呼吸道感染'", () => {
    const input: AiFrontpageSmartCodingInputV14 = { diagnosis: "上呼吸道感染" };
    const result = codeFrontpageByAi(input);
    expect(result.icdCode).toBe("R69.X");
    expect(result.diagnosisName).toBe("上呼吸道感染");
  });
});

describe("buildAiFrontpageSmartCodingReport 构建首页智能编码报告", () => {
  // 手算：{icdCode='I21.4', diagnosisName='急性心梗'}
  // 手算：透传 icdCode + diagnosisName
  it("{icdCode='I21.4', diagnosisName='急性心梗'} → 正确返回（透传）", () => {
    const report = buildAiFrontpageSmartCodingReport({ icdCode: "I21.4", diagnosisName: "急性心梗" });
    expect(report.icdCode).toBe("I21.4");
    expect(report.diagnosisName).toBe("急性心梗");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-frontpage-smart-coding auth:true", () => {
    const def = (emrAiFrontpageSmartCodingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-frontpage-smart-coding");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

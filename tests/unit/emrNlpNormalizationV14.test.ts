/**
 * 健澜科技 jlmedaios - NLP 病历标准化 V14 单测（M491-B）
 *
 * 测试 normalizeMedicalText 标准化、buildNormalizationReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  normalizeMedicalText,
  buildNormalizationReport,
  type NlpNormalizationResultV14,
  type NormalizationV14,
} from "../../src/bff/aggregators/emrNlpNormalizationV14Aggregator";
import { emrNlpNormalizationV14Routes } from "../../src/bff/routes/emrNlpNormalizationV14";
import type { RouteDef } from "../../src/bff/types";

describe("normalizeMedicalText 拉肚子", () => {
  // 手算：含"拉肚子" → normalizations 非空
  it("含'拉肚子' → normalizations 非空", () => {
    const result = normalizeMedicalText("患者拉肚子3天");
    expect(result.normalizations.length).toBeGreaterThan(0);
  });
});

describe("normalizeMedicalText 规范医学术语", () => {
  // 手算：规范医学术语（无口语）→ normalizations=[]
  it("规范医学术语 → normalizations=[]", () => {
    const result = normalizeMedicalText("患者腹泻3天，伴发热");
    expect(result.normalizations).toEqual([]);
  });
});

describe("buildNormalizationReport 2处标准化", () => {
  // 手算：normalizationCount=2 → normalizationCount=2
  it("normalizationCount=2 → normalizationCount=2", () => {
    const normalizations: NormalizationV14[] = [
      { original: "拉肚子", normalized: "腹泻" },
      { original: "发烧", normalized: "发热" },
    ];
    const result: NlpNormalizationResultV14 = { normalizations };
    const report = buildNormalizationReport(result);
    expect(report.normalizationCount).toBe(2);
  });
});

describe("buildNormalizationReport 0处标准化", () => {
  // 手算：normalizationCount=0 → normalizationCount=0
  it("normalizationCount=0 → normalizationCount=0", () => {
    const result: NlpNormalizationResultV14 = { normalizations: [] };
    const report = buildNormalizationReport(result);
    expect(report.normalizationCount).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-nlp-normalization auth:true", () => {
    const def = (emrNlpNormalizationV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-nlp-normalization");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - NLP 病历纠错 V14 单测（M491-A）
 *
 * 测试 correctMedicalText 纠错、buildCorrectionReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  correctMedicalText,
  buildCorrectionReport,
  type NlpCorrectionResultV14,
  type CorrectionV14,
} from "../../src/bff/aggregators/emrNlpCorrectionV14Aggregator";
import { emrNlpCorrectionV14Routes } from "../../src/bff/routes/emrNlpCorrectionV14";
import type { RouteDef } from "../../src/bff/types";

describe("correctMedicalText 腹泄", () => {
  // 手算：含"腹泄" → corrections 非空
  it("含'腹泄' → corrections 非空", () => {
    const result = correctMedicalText("患者腹泄3天");
    expect(result.corrections.length).toBeGreaterThan(0);
  });
});

describe("correctMedicalText 规范书写", () => {
  // 手算：规范书写（无错别字）→ corrections=[]
  it("规范书写 → corrections=[]", () => {
    const result = correctMedicalText("患者腹泻3天，既往高血压病史");
    expect(result.corrections).toEqual([]);
  });
});

describe("buildCorrectionReport 2处纠错", () => {
  // 手算：correctionCount=2 → correctionCount=2
  it("correctionCount=2 → correctionCount=2", () => {
    const corrections: CorrectionV14[] = [
      { original: "腹泄", corrected: "腹泻" },
      { original: "高血亚", corrected: "高血压" },
    ];
    const result: NlpCorrectionResultV14 = { corrections };
    const report = buildCorrectionReport(result);
    expect(report.correctionCount).toBe(2);
  });
});

describe("buildCorrectionReport 0处纠错", () => {
  // 手算：correctionCount=0 → correctionCount=0
  it("correctionCount=0 → correctionCount=0", () => {
    const result: NlpCorrectionResultV14 = { corrections: [] };
    const report = buildCorrectionReport(result);
    expect(report.correctionCount).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-nlp-correction auth:true", () => {
    const def = (emrNlpCorrectionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-nlp-correction");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

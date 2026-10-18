/**
 * 健澜科技 jlmedaios - AI 病历相似病历推荐 V14 单测（M486-D，M486 收官）
 *
 * 测试 findSimilarCases 查找、buildSimilarReport 报告、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  findSimilarCases,
  buildSimilarReport,
  type AiSimilarResultV14,
} from "../../src/bff/aggregators/emrAiSimilarV14Aggregator";
import { emrAiSimilarV14Routes } from "../../src/bff/routes/emrAiSimilarV14";
import type { RouteDef } from "../../src/bff/types";

describe("findSimilarCases 糖尿病匹配", () => {
  // 手算：currentDiagnosis='糖尿病', allCases 含糖尿病 → similarCases 非空
  it("currentDiagnosis='糖尿病', allCases 含糖尿病 → similarCases 非空", () => {
    const allCases = [
      { id: "EMR001", diagnosis: "糖尿病" },
      { id: "EMR002", diagnosis: "高血压" },
    ];
    const result: AiSimilarResultV14 = findSimilarCases("糖尿病", allCases);
    expect(result.similarCases.length).toBeGreaterThan(0);
  });
});

describe("findSimilarCases 无匹配", () => {
  // 手算：无匹配诊断 → similarCases=[]
  it("currentDiagnosis='骨折', allCases 无骨折 → similarCases=[]", () => {
    const allCases = [
      { id: "EMR001", diagnosis: "糖尿病" },
      { id: "EMR002", diagnosis: "高血压" },
    ];
    const result: AiSimilarResultV14 = findSimilarCases("骨折", allCases);
    expect(result.similarCases.length).toBe(0);
  });
});

describe("buildSimilarReport 2条", () => {
  // 手算：similarCases 长度=2 → similarCount=2
  it("similarCases 长度=2 → similarCount=2", () => {
    const result: AiSimilarResultV14 = {
      currentDiagnosis: "糖尿病",
      similarCases: [
        { id: "EMR001", diagnosis: "糖尿病", similarity: 90 },
        { id: "EMR002", diagnosis: "糖尿病", similarity: 85 },
      ],
    };
    const report = buildSimilarReport(result);
    expect(report.similarCount).toBe(2);
  });
});

describe("buildSimilarReport 空", () => {
  // 手算：similarCases=[] → similarCount=0
  it("similarCases=[] → similarCount=0", () => {
    const result: AiSimilarResultV14 = { currentDiagnosis: "糖尿病", similarCases: [] };
    const report = buildSimilarReport(result);
    expect(report.similarCount).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-ai-similar auth:true", () => {
    const def = (emrAiSimilarV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-ai-similar");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

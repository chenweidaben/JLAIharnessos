/**
 * 健澜科技 jlmedaios - AI病历质量预测 V14 单测（M522-B）
 *
 * 测试 buildAiQualityPredict 构建预测、predictQualityScore 预测质量分、buildAiQualityPredictReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQualityPredict,
  buildAiQualityPredictReport,
  predictQualityScore,
  type AiQualityPredictInputV14,
} from "../../src/bff/aggregators/emrAiQualityPredictV14Aggregator";
import { emrAiQualityPredictV14Routes } from "../../src/bff/routes/emrAiQualityPredictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQualityPredict 构建预测", () => {
  // 手算：recordId='REC023', recordType='入院记录' → 正确构建
  it("recordId='REC023', recordType='入院记录' → 正确构建", () => {
    const predict = buildAiQualityPredict("REC023", "入院记录");
    expect(predict.recordId).toBe("REC023");
    expect(predict.recordType).toBe("入院记录");
  });
});

describe("predictQualityScore 预测质量分", () => {
  // 手算：input={completeness:90, timeliness:85, accuracy:92}
  // 手算：score = (90+85+92)/3 = 267/3 = 89.0
  // 手算：89.0 >= 80 → grade='良'
  it("input={completeness:90, timeliness:85, accuracy:92} → score=89, grade='良'", () => {
    const input: AiQualityPredictInputV14 = { completeness: 90, timeliness: 85, accuracy: 92 };
    const result = predictQualityScore(input);
    expect(result.score).toBe(89);
    expect(result.grade).toBe("良");
  });
});

describe("predictQualityScore 满分", () => {
  // 手算：input={completeness:95, timeliness:98, accuracy:97}
  // 手算：score = (95+98+97)/3 = 290/3 = 96.666... → 保留1位 = 96.7
  // 手算：96.7 >= 90 → grade='优'
  it("input={completeness:95, timeliness:98, accuracy:97} → score=96.7, grade='优'", () => {
    const input: AiQualityPredictInputV14 = { completeness: 95, timeliness: 98, accuracy: 97 };
    const result = predictQualityScore(input);
    expect(result.score).toBeCloseTo(96.7, 1);
    expect(result.grade).toBe("优");
  });
});

describe("predictQualityScore 低分", () => {
  // 手算：input={completeness:60, timeliness:55, accuracy:65}
  // 手算：score = (60+55+65)/3 = 180/3 = 60.0
  // 手算：60.0 < 70 → grade='差'
  it("input={completeness:60, timeliness:55, accuracy:65} → score=60, grade='差'", () => {
    const input: AiQualityPredictInputV14 = { completeness: 60, timeliness: 55, accuracy: 65 };
    const result = predictQualityScore(input);
    expect(result.score).toBe(60);
    expect(result.grade).toBe("差");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-quality-predict auth:true", () => {
    const def = (emrAiQualityPredictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-quality-predict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

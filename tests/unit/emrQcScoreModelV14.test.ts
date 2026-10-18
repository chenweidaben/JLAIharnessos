/**
 * 健澜科技 jlmedaios - 病历质控评分模型 V14 单测（M479-A）
 *
 * 测试 buildScoreModel 构建、computeQcScore 加权求和、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildScoreModel,
  computeQcScore,
  type QcScoreDimensionV14,
  type QcScoreModelV14,
} from "../../src/bff/aggregators/emrQcScoreModelV14Aggregator";
import { emrQcScoreModelV14Routes } from "../../src/bff/routes/emrQcScoreModelV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildScoreModel 构建", () => {
  // 手算：name='质控评分模型', dimensions=[{name:'完整性',weight:40},{name:'时效性',weight:30},{name:'规范性',weight:30}] → 正确构建
  it("name=质控评分模型, 3 维度 → 正确构建", () => {
    const dimensions: QcScoreDimensionV14[] = [
      { name: "完整性", weight: 40 },
      { name: "时效性", weight: 30 },
      { name: "规范性", weight: 30 },
    ];
    const model = buildScoreModel("质控评分模型", dimensions);
    expect(model.name).toBe("质控评分模型");
    expect(model.dimensions.length).toBe(3);
  });
});

describe("computeQcScore 加权", () => {
  // 手算：完整性90×40% + 时效性80×30% + 规范性100×30%
  //       = 90*0.4 + 80*0.3 + 100*0.3
  //       = 36 + 24 + 30 = 90
  it("完整性90/时效性80/规范性100 → 加权总分=90", () => {
    const model: QcScoreModelV14 = buildScoreModel("质控评分模型", [
      { name: "完整性", weight: 40 },
      { name: "时效性", weight: 30 },
      { name: "规范性", weight: 30 },
    ]);
    const scores = [
      { dimension: "完整性", score: 90 },
      { dimension: "时效性", score: 80 },
      { dimension: "规范性", score: 100 },
    ];
    expect(computeQcScore(model, scores)).toBe(90);
  });
});

describe("computeQcScore 全100", () => {
  // 手算：全维度100分 → 40*1 + 30*1 + 30*1 = 100
  it("全维度100分 → 总分=100", () => {
    const model: QcScoreModelV14 = buildScoreModel("质控评分模型", [
      { name: "完整性", weight: 40 },
      { name: "时效性", weight: 30 },
      { name: "规范性", weight: 30 },
    ]);
    const scores = [
      { dimension: "完整性", score: 100 },
      { dimension: "时效性", score: 100 },
      { dimension: "规范性", score: 100 },
    ];
    expect(computeQcScore(model, scores)).toBe(100);
  });
});

describe("computeQcScore 全0", () => {
  // 手算：全维度0分 → 0
  it("全维度0分 → 总分=0", () => {
    const model: QcScoreModelV14 = buildScoreModel("质控评分模型", [
      { name: "完整性", weight: 40 },
      { name: "时效性", weight: 30 },
      { name: "规范性", weight: 30 },
    ]);
    const scores = [
      { dimension: "完整性", score: 0 },
      { dimension: "时效性", score: 0 },
      { dimension: "规范性", score: 0 },
    ];
    expect(computeQcScore(model, scores)).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-score-model auth:true", () => {
    const def = (emrQcScoreModelV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-score-model");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

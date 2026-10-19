/**
 * 健澜科技 jlmedaios - 病历AI DIP 分组预测 V14 单测（M552-B）
 *
 * 测试 buildAiDipGroupPredict 构建 AI DIP 分组预测、predictDipGroupByAi AI DIP 分组预测、buildAiDipGroupPredictReport 构建 DIP 分组预测报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDipGroupPredict,
  buildAiDipGroupPredictReport,
  predictDipGroupByAi,
  type AiDipGroupPredictInputV14,
} from "../../src/bff/aggregators/emrAiDipGroupPredictV14Aggregator";
import { emrAiDipGroupPredictV14Routes } from "../../src/bff/routes/emrAiDipGroupPredictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDipGroupPredict 构建 AI DIP 分组预测", () => {
  // 手算：recordId='RECB030', dept='心内科' → 正确构建
  it("recordId='RECB030', dept='心内科' → 正确构建", () => {
    const base = buildAiDipGroupPredict("RECB030", "心内科");
    expect(base.recordId).toBe("RECB030");
    expect(base.dept).toBe("心内科");
  });
});

describe("predictDipGroupByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗', cost=25000}
  // 手算：diagnosis.includes('心梗')=true → dipCode='P19'
  // 手算：score = Math.round(25000*100)/100 = Math.round(2500000)/100 = 25000.00
  it("{diagnosis='急性心梗', cost=25000} → dipCode='P19', score=25000.00", () => {
    const input: AiDipGroupPredictInputV14 = { diagnosis: "急性心梗", cost: 25000 };
    const result = predictDipGroupByAi(input);
    expect(result.dipCode).toBe("P19");
    expect(result.score).toBe(25000.00);
  });
});

describe("predictDipGroupByAi 一般", () => {
  // 手算：{diagnosis='上感', cost=1500}
  // 手算：不含心梗 → dipCode='P01'
  // 手算：score = Math.round(1500*100)/100 = Math.round(150000)/100 = 1500.00
  it("{diagnosis='上感', cost=1500} → dipCode='P01', score=1500.00", () => {
    const input: AiDipGroupPredictInputV14 = { diagnosis: "上感", cost: 1500 };
    const result = predictDipGroupByAi(input);
    expect(result.dipCode).toBe("P01");
    expect(result.score).toBe(1500.00);
  });
});

describe("buildAiDipGroupPredictReport 构建 DIP 分组预测报告", () => {
  // 手算：{dipCode='P19', score=25000.00}
  // 手算：透传 dipCode + score
  it("{dipCode='P19', score=25000.00} → 正确返回（透传）", () => {
    const report = buildAiDipGroupPredictReport({ dipCode: "P19", score: 25000.00 });
    expect(report.dipCode).toBe("P19");
    expect(report.score).toBe(25000.00);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-dip-group-predict auth:true", () => {
    const def = (emrAiDipGroupPredictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-dip-group-predict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

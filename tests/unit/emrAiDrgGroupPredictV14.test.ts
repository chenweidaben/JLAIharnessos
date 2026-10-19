/**
 * 健澜科技 jlmedaios - 病历AI DRG 分组预测 V14 单测（M552-A）
 *
 * 测试 buildAiDrgGroupPredict 构建 AI DRG 分组预测、predictDrgGroupByAi AI DRG 分组预测、buildAiDrgGroupPredictReport 构建 DRG 分组预测报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDrgGroupPredict,
  buildAiDrgGroupPredictReport,
  predictDrgGroupByAi,
  type AiDrgGroupPredictInputV14,
} from "../../src/bff/aggregators/emrAiDrgGroupPredictV14Aggregator";
import { emrAiDrgGroupPredictV14Routes } from "../../src/bff/routes/emrAiDrgGroupPredictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDrgGroupPredict 构建 AI DRG 分组预测", () => {
  // 手算：recordId='RECB029', dept='心内科' → 正确构建
  it("recordId='RECB029', dept='心内科' → 正确构建", () => {
    const base = buildAiDrgGroupPredict("RECB029", "心内科");
    expect(base.recordId).toBe("RECB029");
    expect(base.dept).toBe("心内科");
  });
});

describe("predictDrgGroupByAi FM1", () => {
  // 手算：{diagnosis='急性心梗', hasSurgery=true}
  // 手算：diagnosis.includes('心梗')=true 且 hasSurgery=true → drgGroup='FM1'
  // 手算：drgGroup='FM1' → weight=1.8
  it("{diagnosis='急性心梗', hasSurgery=true} → drgGroup='FM1', weight=1.8", () => {
    const input: AiDrgGroupPredictInputV14 = { diagnosis: "急性心梗", hasSurgery: true };
    const result = predictDrgGroupByAi(input);
    expect(result.drgGroup).toBe("FM1");
    expect(result.weight).toBe(1.8);
  });
});

describe("predictDrgGroupByAi GB1", () => {
  // 手算：{diagnosis='上呼吸道感染', hasSurgery=false}
  // 手算：不含心梗 → drgGroup='GB1'
  // 手算：drgGroup='GB1' → weight=0.8
  it("{diagnosis='上呼吸道感染', hasSurgery=false} → drgGroup='GB1', weight=0.8", () => {
    const input: AiDrgGroupPredictInputV14 = { diagnosis: "上呼吸道感染", hasSurgery: false };
    const result = predictDrgGroupByAi(input);
    expect(result.drgGroup).toBe("GB1");
    expect(result.weight).toBe(0.8);
  });
});

describe("buildAiDrgGroupPredictReport 构建 DRG 分组预测报告", () => {
  // 手算：{drgGroup='FM1', weight=1.8}
  // 手算：透传 drgGroup + weight
  it("{drgGroup='FM1', weight=1.8} → 正确返回（透传）", () => {
    const report = buildAiDrgGroupPredictReport({ drgGroup: "FM1", weight: 1.8 });
    expect(report.drgGroup).toBe("FM1");
    expect(report.weight).toBe(1.8);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-drg-group-predict auth:true", () => {
    const def = (emrAiDrgGroupPredictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-drg-group-predict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 病历AI DRG分组预测 V14 单测（M544-D，M544 收官）
 *
 * 测试 buildAiDrgPredict 构建 AI DRG 预测、predictDrgByAi AI DRG 分组预测、buildAiDrgPredictReport 构建 DRG 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDrgPredict,
  buildAiDrgPredictReport,
  predictDrgByAi,
  type AiDrgPredictInputV14,
} from "../../src/bff/aggregators/emrAiDrgPredictV14Aggregator";
import { emrAiDrgPredictV14Routes } from "../../src/bff/routes/emrAiDrgPredictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDrgPredict 构建 AI DRG 预测", () => {
  // 手算：recordId='RECA004', dept='心内科' → 正确构建
  it("recordId='RECA004', dept='心内科' → 正确构建", () => {
    const base = buildAiDrgPredict("RECA004", "心内科");
    expect(base.recordId).toBe("RECA004");
    expect(base.dept).toBe("心内科");
  });
});

describe("predictDrgByAi 手术", () => {
  // 手算：{diagnosis='急性心梗', hasSurgery=true}
  // 手算：diagnosis.includes('心梗') && hasSurgery → true → drgGroup='FM1'
  // 手算：weight = drgGroup === 'FM1' → 1.8
  it("{diagnosis='急性心梗', hasSurgery=true} → drgGroup='FM1', weight=1.8", () => {
    const input: AiDrgPredictInputV14 = { diagnosis: "急性心梗", hasSurgery: true };
    const result = predictDrgByAi(input);
    expect(result.drgGroup).toBe("FM1");
    expect(result.weight).toBeCloseTo(1.8);
  });
});

describe("predictDrgByAi 非手术", () => {
  // 手算：{diagnosis='急性心梗', hasSurgery=false}
  // 手算：diagnosis.includes('心梗') && hasSurgery → false；diagnosis.includes('心梗') → true → drgGroup='FM2'
  // 手算：weight = drgGroup === 'FM2' → 1.2
  it("{diagnosis='急性心梗', hasSurgery=false} → drgGroup='FM2', weight=1.2", () => {
    const input: AiDrgPredictInputV14 = { diagnosis: "急性心梗", hasSurgery: false };
    const result = predictDrgByAi(input);
    expect(result.drgGroup).toBe("FM2");
    expect(result.weight).toBeCloseTo(1.2);
  });
});

describe("buildAiDrgPredictReport 构建 DRG 报告", () => {
  // 手算：{drgGroup='FM1', weight=1.8}
  // 手算：透传 drgGroup + weight
  it("{drgGroup='FM1', weight=1.8} → 正确返回（透传）", () => {
    const report = buildAiDrgPredictReport({ drgGroup: "FM1", weight: 1.8 });
    expect(report.drgGroup).toBe("FM1");
    expect(report.weight).toBeCloseTo(1.8);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-drg-predict auth:true", () => {
    const def = (emrAiDrgPredictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-drg-predict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

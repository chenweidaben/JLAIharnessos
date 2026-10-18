/**
 * 健澜科技 jlmedaios - DRG 入组预测 V14 单测（M535-C）
 *
 * 测试 buildDrgPredict 构建 DRG 预测、predictDrgGroup DRG 入组预测、buildDrgPredictReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDrgPredict,
  buildDrgPredictReport,
  predictDrgGroup,
  type DrgPredictInputV14,
} from "../../src/bff/aggregators/emrDrgPredictV14Aggregator";
import { emrDrgPredictV14Routes } from "../../src/bff/routes/emrDrgPredictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDrgPredict 构建 DRG 预测", () => {
  // 手算：recordId='REC202', mainDiagnosis='心肌梗死' → 正确构建
  it("recordId='REC202', mainDiagnosis='心肌梗死' → 正确构建", () => {
    const predict = buildDrgPredict("REC202", "心肌梗死");
    expect(predict.recordId).toBe("REC202");
    expect(predict.mainDiagnosis).toBe("心肌梗死");
  });
});

describe("predictDrgGroup 手术", () => {
  // 手算：{mainDiagnosis='心肌梗死', hasSurgery=true, age=65}
  // 手算：mainDiagnosis='心肌梗死' && hasSurgery → drgGroup='FM1', weight=1.8
  it("{mainDiagnosis='心肌梗死', hasSurgery=true, age=65} → drgGroup='FM1', weight=1.8", () => {
    const input: DrgPredictInputV14 = { mainDiagnosis: "心肌梗死", hasSurgery: true, age: 65 };
    const result = predictDrgGroup(input);
    expect(result.drgGroup).toBe("FM1");
    expect(result.weight).toBeCloseTo(1.8, 1);
  });
});

describe("predictDrgGroup 非手术", () => {
  // 手算：{mainDiagnosis='心肌梗死', hasSurgery=false, age=70}
  // 手算：mainDiagnosis='心肌梗死' && !hasSurgery → drgGroup='FM2', weight=1.2
  it("{mainDiagnosis='心肌梗死', hasSurgery=false, age=70} → drgGroup='FM2', weight=1.2", () => {
    const input: DrgPredictInputV14 = { mainDiagnosis: "心肌梗死", hasSurgery: false, age: 70 };
    const result = predictDrgGroup(input);
    expect(result.drgGroup).toBe("FM2");
    expect(result.weight).toBeCloseTo(1.2, 1);
  });
});

describe("buildDrgPredictReport 构建报告", () => {
  // 手算：{drgGroup='FM1', weight=1.8}
  // 手算：透传 drgGroup + weight
  it("{drgGroup='FM1', weight=1.8} → 正确返回（透传）", () => {
    const report = buildDrgPredictReport({ drgGroup: "FM1", weight: 1.8 });
    expect(report.drgGroup).toBe("FM1");
    expect(report.weight).toBe(1.8);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-drg-predict auth:true", () => {
    const def = (emrDrgPredictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-drg-predict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

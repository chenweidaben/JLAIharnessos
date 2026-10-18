/**
 * 健澜科技 jlmedaios - 病历质控权重配置 V14 单测（M479-B）
 *
 * 测试 buildWeightConfig 构建、validateWeights 权重和校验、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildWeightConfig,
  validateWeights,
  type WeightConfigItemV14,
} from "../../src/bff/aggregators/emrQcWeightConfigV14Aggregator";
import { emrQcWeightConfigV14Routes } from "../../src/bff/routes/emrQcWeightConfigV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildWeightConfig 构建", () => {
  // 手算：3 项权重 40/30/30 → 正确构建
  it("3 项权重 40/30/30 → 正确构建", () => {
    const items: WeightConfigItemV14[] = [
      { dimension: "完整性", weight: 40 },
      { dimension: "时效性", weight: 30 },
      { dimension: "规范性", weight: 30 },
    ];
    const config = buildWeightConfig(items);
    expect(config.items.length).toBe(3);
    expect(config.sum).toBe(100);
  });
});

describe("validateWeights sum=100", () => {
  // 手算：40+30+30=100 → valid=true, sum=100
  it("40+30+30=100 → valid=true, sum=100", () => {
    const items: WeightConfigItemV14[] = [
      { dimension: "完整性", weight: 40 },
      { dimension: "时效性", weight: 30 },
      { dimension: "规范性", weight: 30 },
    ];
    const result = validateWeights(items);
    expect(result.valid).toBe(true);
    expect(result.sum).toBe(100);
  });
});

describe("validateWeights sum=90", () => {
  // 手算：40+30+20=90 → valid=false, sum=90
  it("40+30+20=90 → valid=false, sum=90", () => {
    const items: WeightConfigItemV14[] = [
      { dimension: "完整性", weight: 40 },
      { dimension: "时效性", weight: 30 },
      { dimension: "规范性", weight: 20 },
    ];
    const result = validateWeights(items);
    expect(result.valid).toBe(false);
    expect(result.sum).toBe(90);
  });
});

describe("validateWeights 空数组", () => {
  // 手算：空数组 → valid=false, sum=0
  it("空数组 → valid=false, sum=0", () => {
    const result = validateWeights([]);
    expect(result.valid).toBe(false);
    expect(result.sum).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-weight-config auth:true", () => {
    const def = (emrQcWeightConfigV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-weight-config");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

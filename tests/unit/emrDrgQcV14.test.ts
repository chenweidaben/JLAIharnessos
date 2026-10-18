/**
 * 健澜科技 jlmedaios - DRG 病案质控 V14 单测（M480-A）
 *
 * 测试 computeDrgWeight 权重计算、checkDrgCompliance 合规校验、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkDrgCompliance,
  computeDrgWeight,
  type DrgQcInputV14,
  type DrgQcResultV14,
} from "../../src/bff/aggregators/emrDrgQcV14Aggregator";
import { emrDrgQcV14Routes } from "../../src/bff/routes/emrDrgQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("computeDrgWeight 1.80", () => {
  // 手算：baseWeight=1.2, complicationFactor=1.5 → 1.2×1.5 = 1.80
  it("baseWeight=1.2, complicationFactor=1.5 → weight=1.80", () => {
    const weight = computeDrgWeight(1.2, 1.5);
    expect(weight).toBeCloseTo(1.80);
  });
});

describe("computeDrgWeight 1.00", () => {
  // 手算：baseWeight=1.0, complicationFactor=1.0 → 1.0×1.0 = 1.00
  it("baseWeight=1.0, complicationFactor=1.0 → weight=1.00", () => {
    const weight = computeDrgWeight(1.0, 1.0);
    expect(weight).toBeCloseTo(1.00);
  });
});

describe("checkDrgCompliance 合规通过", () => {
  // 手算：主诊断+有手术操作 → 合规通过
  it("主诊断+有手术操作 → 合规通过", () => {
    const input: DrgQcInputV14 = {
      primaryDx: "冠心病",
      secondaryDx: ["高血压"],
      procedures: ["冠状动脉搭桥术"],
    };
    const result: DrgQcResultV14 = checkDrgCompliance(input);
    expect(result.compliant).toBe(true);
  });
});

describe("checkDrgCompliance 主诊断为空", () => {
  // 手算：主诊断为空 → 合规不通过
  it("主诊断为空 → 合规不通过", () => {
    const input: DrgQcInputV14 = {
      primaryDx: "",
      secondaryDx: [],
      procedures: ["冠状动脉搭桥术"],
    };
    const result: DrgQcResultV14 = checkDrgCompliance(input);
    expect(result.compliant).toBe(false);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-drg-qc auth:true", () => {
    const def = (emrDrgQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-drg-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

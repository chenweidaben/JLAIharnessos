/**
 * 健澜科技 jlmedaios - 临床路径质控 V14 单测（M480-B）
 *
 * 测试 buildClinicalPathQc 构建、detectPathVariation 变异检测、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClinicalPathQc,
  detectPathVariation,
  type ClinicalPathQcV14,
  type PathStepV14,
} from "../../src/bff/aggregators/emrClinicalPathQcV14Aggregator";
import { emrClinicalPathQcV14Routes } from "../../src/bff/routes/emrClinicalPathQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildClinicalPathQc 构建", () => {
  // 手算：patientId='P001', diagnosis='肺炎' → 正确构建
  it("patientId=P001, diagnosis=肺炎 → 正确构建", () => {
    const record: ClinicalPathQcV14 = buildClinicalPathQc("P001", "肺炎");
    expect(record.patientId).toBe("P001");
    expect(record.diagnosis).toBe("肺炎");
  });
});

describe("detectPathVariation 1 条变异", () => {
  // 手算：3 步，1 步 planned≠actual → 返回 1 条变异
  it("3 步，1 步 planned≠actual → 返回 1 条变异", () => {
    const steps: PathStepV14[] = [
      { name: "入院评估", planned: "入院当天", actual: "入院当天" },
      { name: "检查检验", planned: "入院第1天", actual: "入院第2天" },
      { name: "治疗方案", planned: "入院第2天", actual: "入院第2天" },
    ];
    const variations = detectPathVariation(steps);
    expect(variations.length).toBe(1);
    expect(variations[0].stepName).toBe("检查检验");
  });
});

describe("detectPathVariation 全部一致", () => {
  // 手算：3 步全部一致 → 返回空数组
  it("3 步全部一致 → 返回空数组", () => {
    const steps: PathStepV14[] = [
      { name: "入院评估", planned: "入院当天", actual: "入院当天" },
      { name: "检查检验", planned: "入院第1天", actual: "入院第1天" },
      { name: "治疗方案", planned: "入院第2天", actual: "入院第2天" },
    ];
    const variations = detectPathVariation(steps);
    expect(variations).toEqual([]);
  });
});

describe("detectPathVariation 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    const variations = detectPathVariation([]);
    expect(variations).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-clinical-path-qc auth:true", () => {
    const def = (emrClinicalPathQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-clinical-path-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

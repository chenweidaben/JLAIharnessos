/**
 * 健澜科技 jlmedaios - 病历逻辑校验 V14 单测（M477-B）
 *
 * 测试 findLogicErrors 逻辑匹配校验、validateLogicRelations 错误计数、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  findLogicErrors,
  validateLogicRelations,
  type LogicValidationDataV14,
} from "../../src/bff/aggregators/emrLogicValidationV14Aggregator";
import { emrLogicValidationV14Routes } from "../../src/bff/routes/emrLogicValidationV14";
import type { RouteDef } from "../../src/bff/types";

describe("findLogicErrors 逻辑一致", () => {
  // 手算：诊断"高血压"+治疗"降压治疗"+用药"硝苯地平"
  //   - 高血压 → 治疗含"降压" ✓
  //   - 高血压 → 用药"硝苯地平"不含"降糖" ✓
  //   → 空数组 []
  it("诊断高血压+降压治疗+硝苯地平 → 逻辑一致 → 空数组", () => {
    const data: LogicValidationDataV14 = {
      diagnosis: "高血压",
      treatment: "降压治疗",
      medication: "硝苯地平",
    };
    expect(findLogicErrors(data)).toEqual([]);
  });
});

describe("findLogicErrors 用药不匹配", () => {
  // 手算：诊断"糖尿病"+治疗""+用药"降压药"
  //   - 糖尿病 → 治疗不含"降糖" → 报错"治疗与诊断不匹配"
  //   - 糖尿病 → 用药含"降压" → 报错"用药与诊断不匹配"
  //   → 非空错误列表
  it("诊断糖尿病+用药降压药 → 用药与诊断不匹配 → 返回非空错误", () => {
    const data: LogicValidationDataV14 = {
      diagnosis: "糖尿病",
      treatment: "",
      medication: "降压药",
    };
    const errors = findLogicErrors(data);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("validateLogicRelations 逻辑一致", () => {
  // 手算：逻辑一致 → errorCount=0
  it("逻辑一致 → errorCount=0", () => {
    const data: LogicValidationDataV14 = {
      diagnosis: "高血压",
      treatment: "降压治疗",
      medication: "硝苯地平",
    };
    const result = validateLogicRelations(data);
    expect(result.errorCount).toBe(0);
  });
});

describe("validateLogicRelations 不匹配", () => {
  // 手算：用药与诊断不匹配 → errorCount>=1
  it("用药与诊断不匹配 → errorCount>=1", () => {
    const data: LogicValidationDataV14 = {
      diagnosis: "糖尿病",
      treatment: "",
      medication: "降压药",
    };
    const result = validateLogicRelations(data);
    expect(result.errorCount).toBeGreaterThanOrEqual(1);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-logic-validation auth:true", () => {
    const def = (emrLogicValidationV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-logic-validation");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

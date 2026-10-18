/**
 * 健澜科技 jlmedaios - 出院病历质控 V14 单测（M481-C）
 *
 * 测试 checkDischargeReadiness 就绪度检查、computeDischargeScore 得分计算、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkDischargeReadiness,
  computeDischargeScore,
  type DischargeItemV14,
  type DischargeQcResultV14,
} from "../../src/bff/aggregators/emrDischargeQcV14Aggregator";
import { emrDischargeQcV14Routes } from "../../src/bff/routes/emrDischargeQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("checkDischargeReadiness 4完成1未完成", () => {
  // 手算：5 项 4 完成 1 未完成 → incompleteItems 含 1 项
  it("5 项 4 完成 1 未完成 → incompleteItems 含 1 项", () => {
    const items: DischargeItemV14[] = [
      { name: "出院小结", completed: true },
      { name: "出院诊断", completed: true },
      { name: "治疗总结", completed: true },
      { name: "出院医嘱", completed: true },
      { name: "随访计划", completed: false },
    ];
    const result: DischargeQcResultV14 = checkDischargeReadiness(items);
    expect(result.completedCount).toBe(4);
    expect(result.incompleteItems.length).toBe(1);
    expect(result.incompleteItems[0]).toBe("随访计划");
  });
});

describe("checkDischargeReadiness 全完成", () => {
  // 手算：5 项全完成 → incompleteItems=[]
  it("5 项全完成 → incompleteItems=[]", () => {
    const items: DischargeItemV14[] = [
      { name: "出院小结", completed: true },
      { name: "出院诊断", completed: true },
      { name: "治疗总结", completed: true },
      { name: "出院医嘱", completed: true },
      { name: "随访计划", completed: true },
    ];
    const result: DischargeQcResultV14 = checkDischargeReadiness(items);
    expect(result.incompleteItems).toEqual([]);
  });
});

describe("computeDischargeScore 80", () => {
  // 手算：completedCount=4, total=5 → 4/5×100 = 80
  it("completedCount=4, total=5 → score=80", () => {
    const score = computeDischargeScore({ completedCount: 4, total: 5 });
    expect(score).toBe(80);
  });
});

describe("computeDischargeScore 100", () => {
  // 手算：completedCount=5, total=5 → 5/5×100 = 100
  it("completedCount=5, total=5 → score=100", () => {
    const score = computeDischargeScore({ completedCount: 5, total: 5 });
    expect(score).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-discharge-qc auth:true", () => {
    const def = (emrDischargeQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-discharge-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

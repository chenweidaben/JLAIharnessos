/**
 * 健澜科技 jlmedaios - 病历质控科室自查 V14 单测（M474-B）
 *
 * 测试 buildSelfCheck 创建、computeSelfCheckScore 得分计算、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSelfCheck,
  computeSelfCheckScore,
  type SelfCheckItemV14,
} from "../../src/bff/aggregators/emrDeptSelfCheckV14Aggregator";
import { emrDeptSelfCheckV14Routes } from "../../src/bff/routes/emrDeptSelfCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSelfCheck 创建", () => {
  // 手算：dept='内科', items 含 3 项 → 正确创建，自动计算 score
  it("dept='内科', items 含 3 项 → 正确创建", () => {
    const items: SelfCheckItemV14[] = [
      { name: "主诉完整", passed: true },
      { name: "现病史规范", passed: false },
      { name: "诊断明确", passed: true },
    ];
    const record = buildSelfCheck("内科", items);
    expect(record.dept).toBe("内科");
    expect(record.items.length).toBe(3);
  });
});

describe("computeSelfCheckScore 全通过", () => {
  // 手算：5 项全通过 → passedCount=5, score=5/5×100=100
  it("5 项全通过 → score=100", () => {
    const items: SelfCheckItemV14[] = [
      { name: "A", passed: true },
      { name: "B", passed: true },
      { name: "C", passed: true },
      { name: "D", passed: true },
      { name: "E", passed: true },
    ];
    const result = computeSelfCheckScore(items);
    expect(result.score).toBe(100);
  });
});

describe("computeSelfCheckScore 部分通过", () => {
  // 手算：4 项 3 通过 → passedCount=3, score=3/4×100=75
  it("4 项 3 通过 → score=75", () => {
    const items: SelfCheckItemV14[] = [
      { name: "A", passed: true },
      { name: "B", passed: true },
      { name: "C", passed: true },
      { name: "D", passed: false },
    ];
    const result = computeSelfCheckScore(items);
    expect(result.passedCount).toBe(3);
    expect(result.score).toBe(75);
  });
});

describe("computeSelfCheckScore 空数组", () => {
  // 手算：空数组 → total=0, score=0
  it("空数组 → score=0", () => {
    const result = computeSelfCheckScore([]);
    expect(result.total).toBe(0);
    expect(result.score).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-dept-self-check auth:true", () => {
    const def = (emrDeptSelfCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-dept-self-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

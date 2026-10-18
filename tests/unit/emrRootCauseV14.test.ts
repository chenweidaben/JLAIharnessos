/**
 * 健澜科技 jlmedaios - 病历缺陷根因分析 V14 单测（M468-B）
 *
 * 测试 analyzeRootCause 频次+百分比、buildCauseTree 因果树、POST /root-cause auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeRootCause,
  buildCauseTree,
} from "../../src/bff/aggregators/emrRootCauseV14Aggregator";
import { emrRootCauseV14Routes } from "../../src/bff/routes/emrRootCauseV14";
import type { RouteDef } from "../../src/bff/types";

describe("analyzeRootCause 频次+百分比", () => {
  // 手算：["主诉缺失","主诉缺失","现病史过短"] → 主诉缺失 count=2, 2/3×100=66.67 → Math.round=67
  it("主诉缺失 count=2，percent=67", () => {
    const result = analyzeRootCause(["主诉缺失", "主诉缺失", "现病史过短"]);
    const top = result[0];
    expect(top?.cause).toBe("主诉缺失");
    expect(top?.count).toBe(2);
    expect(top?.percent).toBe(67);
  });
});

describe("analyzeRootCause 相同缺陷", () => {
  // 手算：全是"主诉缺失" → 只有 1 类，count=3, percent=100
  it("相同缺陷 → 频次正确", () => {
    const result = analyzeRootCause(["主诉缺失", "主诉缺失", "主诉缺失"]);
    expect(result.length).toBe(1);
    expect(result[0]?.count).toBe(3);
  });
});

describe("analyzeRootCause 空数组", () => {
  // 手算：空数组 → 返回空数组 []
  it("空数组 → 返回空数组", () => {
    expect(analyzeRootCause([])).toEqual([]);
  });
});

describe("buildCauseTree 根因", () => {
  // 手算：频次最高的"主诉缺失"为 rootCause，其余为 subCauses
  it("频次最高的'主诉缺失'为 rootCause", () => {
    const analysis = analyzeRootCause(["主诉缺失", "主诉缺失", "现病史过短"]);
    const tree = buildCauseTree(analysis);
    expect(tree.rootCause).toBe("主诉缺失");
    expect(tree.subCauses).toContain("现病史过短");
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-root-cause auth:true", () => {
    const def = (emrRootCauseV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-root-cause");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

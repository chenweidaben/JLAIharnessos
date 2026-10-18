/**
 * 健澜科技 jlmedaios - 质控缺陷统计 V14 单测（M500-A）
 *
 * 测试 buildDefectStat 构建、aggregateDefectStat 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateDefectStat,
  buildDefectStat,
  type DefectStatV14,
} from "../../src/bff/aggregators/emrQcDefectStatV14Aggregator";
import { emrQcDefectStatV14Routes } from "../../src/bff/routes/emrQcDefectStatV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDefectStat 缺主诉", () => {
  // 手算：category='缺主诉', count=15 → 正确构建
  it("category='缺主诉', count=15 → 正确构建", () => {
    const stat: DefectStatV14 = buildDefectStat("缺主诉", 15);
    expect(stat.category).toBe("缺主诉");
    expect(stat.count).toBe(15);
  });
});

describe("aggregateDefectStat 三条统计", () => {
  // 手算：3 条统计（缺主诉15/超时限8/术语不规范5）→ total=28（15+8+5=28）, categories=3
  it("3 条统计 → total=28, categories=3", () => {
    const stats: DefectStatV14[] = [
      buildDefectStat("缺主诉", 15),
      buildDefectStat("超时限", 8),
      buildDefectStat("术语不规范", 5),
    ];
    const result = aggregateDefectStat(stats);
    expect(result.total).toBe(28);
    expect(result.categories).toBe(3);
  });
});

describe("aggregateDefectStat 空数组", () => {
  // 手算：空数组 → total=0, categories=0
  it("空数组 → total=0, categories=0", () => {
    const stats: DefectStatV14[] = [];
    const result = aggregateDefectStat(stats);
    expect(result.total).toBe(0);
    expect(result.categories).toBe(0);
  });
});

describe("buildDefectStat 缺查体", () => {
  // 手算：category='缺查体', count=10 → 正确构建
  it("category='缺查体', count=10 → 正确构建", () => {
    const stat: DefectStatV14 = buildDefectStat("缺查体", 10);
    expect(stat.category).toBe("缺查体");
    expect(stat.count).toBe(10);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-defect-stat auth:true", () => {
    const def = (emrQcDefectStatV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-defect-stat");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

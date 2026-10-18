/**
 * 健澜科技 jlmedaios - 质控知识推理路径 V14 单测（M489-C）
 *
 * 测试 buildReasoningPath 构建、findReasoningPaths 查找、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReasoningPath,
  findReasoningPaths,
  type ReasoningPathV14,
} from "../../src/bff/aggregators/emrQcReasoningPathV14Aggregator";
import { emrQcReasoningPathV14Routes } from "../../src/bff/routes/emrQcReasoningPathV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildReasoningPath P001", () => {
  // 手算：id='P001', nodes=['糖尿病','高血糖','胰岛素'], edges=['糖尿病→高血糖','高血糖→胰岛素'] → 正确构建
  it("id='P001', nodes=['糖尿病','高血糖','胰岛素'], edges=['糖尿病→高血糖','高血糖→胰岛素'] → 正确构建", () => {
    const path: ReasoningPathV14 = buildReasoningPath(
      "P001",
      ["糖尿病", "高血糖", "胰岛素"],
      ["糖尿病→高血糖", "高血糖→胰岛素"]
    );
    expect(path.id).toBe("P001");
    expect(path.nodes).toEqual(["糖尿病", "高血糖", "胰岛素"]);
    expect(path.edges).toEqual(["糖尿病→高血糖", "高血糖→胰岛素"]);
  });
});

describe("findReasoningPaths A→C", () => {
  // 手算：start='A', end='C', relations=[{source:'A',target:'B'},{source:'B',target:'C'}] → paths 非空, pathCount>=1
  it("start='A', end='C', relations=[{source:'A',target:'B'},{source:'B',target:'C'}] → paths 非空, pathCount>=1", () => {
    const result = findReasoningPaths("A", "C", [
      { source: "A", target: "B" },
      { source: "B", target: "C" },
    ]);
    expect(result.pathCount).toBeGreaterThanOrEqual(1);
    expect(result.paths.length).toBeGreaterThanOrEqual(1);
  });
});

describe("findReasoningPaths A→D 无路径", () => {
  // 手算：start='A', end='D', relations=[{source:'A',target:'B'}] → paths=[], pathCount=0
  it("start='A', end='D', relations=[{source:'A',target:'B'}] → paths=[], pathCount=0", () => {
    const result = findReasoningPaths("A", "D", [{ source: "A", target: "B" }]);
    expect(result.pathCount).toBe(0);
    expect(result.paths).toEqual([]);
  });
});

describe("buildReasoningPath P002", () => {
  // 手算：id='P002', nodes=['高血压','降压药'], edges=['高血压→降压药'] → 正确构建
  it("id='P002', nodes=['高血压','降压药'], edges=['高血压→降压药'] → 正确构建", () => {
    const path: ReasoningPathV14 = buildReasoningPath(
      "P002",
      ["高血压", "降压药"],
      ["高血压→降压药"]
    );
    expect(path.id).toBe("P002");
    expect(path.nodes).toEqual(["高血压", "降压药"]);
    expect(path.edges).toEqual(["高血压→降压药"]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-reasoning-path auth:true", () => {
    const def = (emrQcReasoningPathV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-reasoning-path");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

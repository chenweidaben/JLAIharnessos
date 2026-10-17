/**
 * 健澜科技 jlmedaios - 扩散网络图谱 V13 单测（M304-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDiffusionGraphV13,
  computeDeptInfluenceV13,
  identifyIsolatedDeptsV13,
  type DeptNodeV13,
  type DiffusionEdgeV13,
} from "../../src/bff/aggregators/diffusionGraphV13Aggregator";
import { diffusionGraphV13Routes } from "../../src/bff/routes/diffusionGraphV13";

const nodes: DeptNodeV13[] = [
  { deptId: "cardio", deptName: "心内科" },
  { deptId: "surgery", deptName: "外科" },
  { deptId: "emergency", deptName: "急诊" },
  { deptId: "neurology", deptName: "神内" },
  { deptId: "pediatrics", deptName: "儿科" },
];

const edges: DiffusionEdgeV13[] = [
  { source: "cardio", target: "surgery", count: 3 },
  { source: "cardio", target: "emergency", count: 2 },
  { source: "surgery", target: "neurology", count: 1 },
];

describe("buildDiffusionGraphV13", () => {
  it("透传 5节点 + 3边", () => {
    const g = buildDiffusionGraphV13(nodes, edges);
    expect(g.nodes.length).toBe(5);
    expect(g.edges.length).toBe(3);
  });
  it("空态 → 0", () => {
    const g = buildDiffusionGraphV13([], []);
    expect(g.nodes.length).toBe(0);
  });
});

describe("computeDeptInfluenceV13", () => {
  // 算式：cardio 作为 source 出现 2 次（cardio→surgery, cardio→emergency）
  it("cardio influence = 2", () => {
    expect(computeDeptInfluenceV13(nodes[0], edges)).toBe(2);
  });
  // 算式：surgery 作为 source 出现 1 次（surgery→neurology）
  it("surgery influence = 1", () => {
    expect(computeDeptInfluenceV13(nodes[1], edges)).toBe(1);
  });
});

describe("identifyIsolatedDeptsV13", () => {
  // 算式：connected = {cardio, surgery, emergency, neurology}，pediatrics 不在其中
  it("pediatrics 是孤岛（1 个）", () => {
    const isolated = identifyIsolatedDeptsV13(nodes, edges);
    expect(isolated.length).toBe(1);
    expect(isolated[0].deptId).toBe("pediatrics");
  });
});

describe("diffusionGraphV13Routes 读路由", () => {
  it("GET /api/v1/diffusion-graph 路由存在且 auth:true", () => {
    const route = diffusionGraphV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/diffusion-graph",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});

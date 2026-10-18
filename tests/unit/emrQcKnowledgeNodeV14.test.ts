/**
 * 健澜科技 jlmedaios - 质控知识节点管理 V14 单测（M489-A）
 *
 * 测试 buildKnowledgeNode 构建、aggregateKnowledgeNodes 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildKnowledgeNode,
  aggregateKnowledgeNodes,
  type KnowledgeNodeV14,
} from "../../src/bff/aggregators/emrQcKnowledgeNodeV14Aggregator";
import { emrQcKnowledgeNodeV14Routes } from "../../src/bff/routes/emrQcKnowledgeNodeV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildKnowledgeNode N001", () => {
  // 手算：id='N001', name='糖尿病', type='疾病' → 正确构建
  it("id='N001', name='糖尿病', type='疾病' → 正确构建", () => {
    const node: KnowledgeNodeV14 = buildKnowledgeNode("N001", "糖尿病", "疾病");
    expect(node.id).toBe("N001");
    expect(node.name).toBe("糖尿病");
    expect(node.type).toBe("疾病");
  });
});

describe("aggregateKnowledgeNodes 3个节点", () => {
  // 手算：3 个节点（疾病/药物/症状）→ count=3, types=['疾病','药物','症状']
  it("3 个节点（疾病/药物/症状）→ count=3, types=['疾病','药物','症状']", () => {
    const nodes = [
      { id: "N001", name: "糖尿病", type: "疾病" },
      { id: "N002", name: "二甲双胍", type: "药物" },
      { id: "N003", name: "头痛", type: "症状" },
    ];
    const result = aggregateKnowledgeNodes(nodes);
    expect(result.count).toBe(3);
    expect(result.types).toEqual(["疾病", "药物", "症状"]);
  });
});

describe("aggregateKnowledgeNodes 空数组", () => {
  // 手算：空数组 → count=0, types=[]
  it("空数组 → count=0, types=[]", () => {
    const nodes: { id: string; name: string; type: string }[] = [];
    const result = aggregateKnowledgeNodes(nodes);
    expect(result.count).toBe(0);
    expect(result.types).toEqual([]);
  });
});

describe("buildKnowledgeNode N002", () => {
  // 手算：id='N002', name='高血压', type='疾病' → 正确构建
  it("id='N002', name='高血压', type='疾病' → 正确构建", () => {
    const node: KnowledgeNodeV14 = buildKnowledgeNode("N002", "高血压", "疾病");
    expect(node.id).toBe("N002");
    expect(node.name).toBe("高血压");
    expect(node.type).toBe("疾病");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-knowledge-node auth:true", () => {
    const def = (emrQcKnowledgeNodeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-knowledge-node");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

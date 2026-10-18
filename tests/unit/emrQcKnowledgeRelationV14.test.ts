/**
 * 健澜科技 jlmedaios - 质控知识关系管理 V14 单测（M489-B）
 *
 * 测试 buildKnowledgeRelation 构建、aggregateKnowledgeRelations 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildKnowledgeRelation,
  aggregateKnowledgeRelations,
  type KnowledgeRelationV14,
} from "../../src/bff/aggregators/emrQcKnowledgeRelationV14Aggregator";
import { emrQcKnowledgeRelationV14Routes } from "../../src/bff/routes/emrQcKnowledgeRelationV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildKnowledgeRelation R001", () => {
  // 手算：id='R001', source='糖尿病', target='高血糖', type='导致' → 正确构建
  it("id='R001', source='糖尿病', target='高血糖', type='导致' → 正确构建", () => {
    const relation: KnowledgeRelationV14 = buildKnowledgeRelation("R001", "糖尿病", "高血糖", "导致");
    expect(relation.id).toBe("R001");
    expect(relation.source).toBe("糖尿病");
    expect(relation.target).toBe("高血糖");
    expect(relation.type).toBe("导致");
  });
});

describe("aggregateKnowledgeRelations 3个关系", () => {
  // 手算：3 个关系（导致/治疗/禁忌）→ count=3, relationTypes=['导致','治疗','禁忌']
  it("3 个关系（导致/治疗/禁忌）→ count=3, relationTypes=['导致','治疗','禁忌']", () => {
    const relations = [
      { id: "R001", source: "糖尿病", target: "高血糖", type: "导致" },
      { id: "R002", source: "高血压", target: "降压药", type: "治疗" },
      { id: "R003", source: "青霉素", target: "过敏患者", type: "禁忌" },
    ];
    const result = aggregateKnowledgeRelations(relations);
    expect(result.count).toBe(3);
    expect(result.relationTypes).toEqual(["导致", "治疗", "禁忌"]);
  });
});

describe("aggregateKnowledgeRelations 空数组", () => {
  // 手算：空数组 → count=0, relationTypes=[]
  it("空数组 → count=0, relationTypes=[]", () => {
    const relations: { id: string; source: string; target: string; type: string }[] = [];
    const result = aggregateKnowledgeRelations(relations);
    expect(result.count).toBe(0);
    expect(result.relationTypes).toEqual([]);
  });
});

describe("buildKnowledgeRelation R002", () => {
  // 手算：id='R002', source='高血压', target='降压药', type='治疗' → 正确构建
  it("id='R002', source='高血压', target='降压药', type='治疗' → 正确构建", () => {
    const relation: KnowledgeRelationV14 = buildKnowledgeRelation("R002", "高血压", "降压药", "治疗");
    expect(relation.id).toBe("R002");
    expect(relation.source).toBe("高血压");
    expect(relation.target).toBe("降压药");
    expect(relation.type).toBe("治疗");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-knowledge-relation auth:true", () => {
    const def = (emrQcKnowledgeRelationV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-knowledge-relation");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});

/**
 * 健澜科技 jlmedaios - 质控知识关系管理 V14 路由（M489-B）
 *
 * GET /api/v1/emr-qc-knowledge-relation  （read，auth:true）返回知识关系数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateKnowledgeRelations, buildKnowledgeRelation } from "../aggregators/emrQcKnowledgeRelationV14Aggregator.js";

const sampleRelations = [
  { id: "R001", source: "糖尿病", target: "高血糖", type: "导致" },
  { id: "R002", source: "高血压", target: "降压药", type: "治疗" },
  { id: "R003", source: "青霉素", target: "过敏患者", type: "禁忌" },
];

export const emrQcKnowledgeRelationV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-knowledge-relation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-knowledge-relation:read");
      if (denied) return denied;
      const relations = sampleRelations.map((r) => buildKnowledgeRelation(r.id, r.source, r.target, r.type));
      const aggregate = aggregateKnowledgeRelations(relations);
      return json(ok({ relations, aggregate }));
    },
  },
];

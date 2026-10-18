/**
 * 健澜科技 jlmedaios - 质控知识节点管理 V14 路由（M489-A）
 *
 * GET /api/v1/emr-qc-knowledge-node  （read，auth:true）返回知识节点数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateKnowledgeNodes, buildKnowledgeNode } from "../aggregators/emrQcKnowledgeNodeV14Aggregator.js";

const sampleNodes = [
  { id: "N001", name: "糖尿病", type: "疾病" },
  { id: "N002", name: "高血压", type: "疾病" },
  { id: "N003", name: "二甲双胍", type: "药物" },
  { id: "N004", name: "头痛", type: "症状" },
];

export const emrQcKnowledgeNodeV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-knowledge-node",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-knowledge-node:read");
      if (denied) return denied;
      const nodes = sampleNodes.map((n) => buildKnowledgeNode(n.id, n.name, n.type));
      const aggregate = aggregateKnowledgeNodes(nodes);
      return json(ok({ nodes, aggregate }));
    },
  },
];

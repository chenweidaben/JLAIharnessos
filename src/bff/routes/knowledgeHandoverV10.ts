/**
 * 健澜科技 jlmedaios - 个人知识图谱与继任者交接 V10 路由（M292-C）
 *
 * GET  /api/v1/knowledge/graph/:doctorId 知识图谱
 * POST /api/v1/knowledge/handover 交接打包
 * GET  /api/v1/knowledge/handover-priority 交接优先级
 *
 * 权限：knowledge:read / knowledge:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHandoverPackageV10,
  buildKnowledgeGraphV10,
  rankHandoverPriorityV10,
  type DoctorGraphV10,
} from "../aggregators/knowledgeHandoverV10Aggregator.js";

const graphStore: DoctorGraphV10[] = [
  buildKnowledgeGraphV10("d-001", "心内科", 50, 3, 10, ["急性心梗", "心衰"]),
  buildKnowledgeGraphV10("d-002", "急诊科", 30, 5, 5, ["创伤", "中毒"]),
];

export const knowledgeHandoverV10Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/knowledge/graph/:doctorId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge:read");
      if (denied) return denied;

      const doctorId = c.params.doctorId;
      const g = graphStore.find((x) => x.doctorId === doctorId);
      if (!g) {
        return json(ok({ found: false }));
      }
      return json(ok(g));
    },
  },
  {
    method: "POST",
    path: "/api/v1/knowledge/handover",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge:write");
      if (denied) return denied;

      const body = await c.req.json() as { fromDoctor: string; toDoctor: string };
      const graph = graphStore.find((x) => x.doctorId === body.fromDoctor) ?? graphStore[0];
      void new URL(c.req.url).searchParams.get("dryRun");
      return json(ok(buildHandoverPackageV10(body.fromDoctor, body.toDoctor, graph)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/knowledge/handover-priority",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge:read");
      if (denied) return denied;

      return json(ok(rankHandoverPriorityV10(graphStore)));
    },
  },
];

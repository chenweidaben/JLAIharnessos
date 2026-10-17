/**
 * 健澜科技 jlmedaios - 扩散网络图谱 V13 路由（M304-C）
 *
 * GET /api/v1/diffusion-graph
 *
 * 权限：diffusion-graph:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDiffusionGraphV13,
  computeDeptInfluenceV13,
  identifyIsolatedDeptsV13,
  type DeptNodeV13,
  type DiffusionEdgeV13,
} from "../aggregators/diffusionGraphV13Aggregator.js";

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

export const diffusionGraphV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/diffusion-graph",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "diffusion-graph:read");
      if (denied) return denied;
      const graph = buildDiffusionGraphV13(nodes, edges);
      return json(ok({
        ...graph,
        influenceByDept: nodes.map((n) => ({
          deptId: n.deptId,
          influence: computeDeptInfluenceV13(n, edges),
        })),
        isolated: identifyIsolatedDeptsV13(nodes, edges),
      }));
    },
  },
];

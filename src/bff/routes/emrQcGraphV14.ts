/**
 * 健澜科技 jlmedaios - 病历质控知识图谱 V14 路由（M465-D，M465 收官）
 *
 * GET /api/v1/emr-qc-graph （read，auth:true）返回知识链
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  findRelatedDefects,
  getRemediationAdvice,
  QC_GRAPH_V14,
} from "../aggregators/emrQcGraphV14Aggregator.js";

export const emrQcGraphV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-graph",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-graph:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ graph: QC_GRAPH_V14, findRelatedDefects, getRemediationAdvice }));
    },
  },
];

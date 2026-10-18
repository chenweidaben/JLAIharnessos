/**
 * 健澜科技 jlmedaios - 质控规范库管理 V14 路由（M505-A）
 *
 * GET  /api/v1/emr-qc-norm-library  （read，auth:true）返回规范列表
 * POST /api/v1/emr-qc-norm-library  （auth:true）添加规范
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { addNorm, buildNorm, type NormLibraryV14 } from "../aggregators/emrQcNormLibraryV14Aggregator.js";

let sampleNorms: NormLibraryV14[] = [
  buildNorm("病历书写规范", "书写要求", "V2.0"),
  buildNorm("质控核心制度", "管理制度", "V1.5"),
];

export const emrQcNormLibraryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-norm-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-norm-library:read");
      if (denied) return denied;
      return json(ok({ norms: sampleNorms, total: sampleNorms.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-norm-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-norm-library:write");
      if (denied) return denied;
      const body = await c.req.json();
      const title = typeof body?.title === "string" ? body.title : "";
      const category = typeof body?.category === "string" ? body.category : "";
      const version = typeof body?.version === "string" ? body.version : "";
      const norm = buildNorm(title, category, version);
      sampleNorms = addNorm(sampleNorms, norm);
      return json(ok({ norms: sampleNorms, total: sampleNorms.length }));
    },
  },
];

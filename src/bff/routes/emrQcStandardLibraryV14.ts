/**
 * 健澜科技 jlmedaios - 质控行业标准库 V14 路由（M520-C）
 *
 * GET  /api/v1/emr-qc-standard-library  （read，auth:true）返回标准库基础数据
 * POST /api/v1/emr-qc-standard-library  （auth:true）搜索标准 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildStandardLibrary,
  buildStandardLibraryReport,
  searchStandards,
  type StandardV14,
} from "../aggregators/emrQcStandardLibraryV14Aggregator.js";

export const emrQcStandardLibraryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-standard-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-standard-library:read");
      if (denied) return denied;
      const library = buildStandardLibrary("国家规范", 45);
      return json(ok(library));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-standard-library",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-standard-library:write");
      if (denied) return denied;
      const body = await c.req.json();
      const query = String(body?.query ?? "");
      const standards: StandardV14[] = Array.isArray(body?.standards)
        ? body.standards.map((s: unknown) => ({
            id: String((s as StandardV14)?.id ?? ""),
            title: String((s as StandardV14)?.title ?? ""),
            issuer: String((s as StandardV14)?.issuer ?? ""),
          }))
        : [];
      const result = searchStandards(query, standards);
      const report = buildStandardLibraryReport(result);
      return json(ok({ query, standards, result, report }));
    },
  },
];

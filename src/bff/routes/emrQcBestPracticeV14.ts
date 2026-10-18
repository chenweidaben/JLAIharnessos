/**
 * 健澜科技 jlmedaios - 质控最佳实践库 V14 路由（M520-D，M520 收官）
 *
 * GET  /api/v1/emr-qc-best-practice  （read，auth:true）返回最佳实践库基础数据
 * POST /api/v1/emr-qc-best-practice  （auth:true）搜索最佳实践 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildBestPractice,
  buildBestPracticeReport,
  searchBestPractices,
  type BestPracticeItemV14,
} from "../aggregators/emrQcBestPracticeV14Aggregator.js";

export const emrQcBestPracticeV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-best-practice",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-best-practice:read");
      if (denied) return denied;
      const library = buildBestPractice("三甲医院实践", 30);
      return json(ok(library));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-best-practice",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-best-practice:write");
      if (denied) return denied;
      const body = await c.req.json();
      const query = String(body?.query ?? "");
      const practices: BestPracticeItemV14[] = Array.isArray(body?.practices)
        ? body.practices.map((p: unknown) => ({
            id: String((p as BestPracticeItemV14)?.id ?? ""),
            title: String((p as BestPracticeItemV14)?.title ?? ""),
            hospital: String((p as BestPracticeItemV14)?.hospital ?? ""),
          }))
        : [];
      const result = searchBestPractices(query, practices);
      const report = buildBestPracticeReport(result);
      return json(ok({ query, practices, result, report }));
    },
  },
];

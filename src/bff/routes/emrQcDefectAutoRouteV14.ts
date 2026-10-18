/**
 * 健澜科技 jlmedaios - 病历缺陷自动分发 V14 路由（M521-C）
 *
 * GET  /api/v1/emr-qc-defect-auto-route  （read，auth:true）返回缺陷分发基础数据
 * POST /api/v1/emr-qc-defect-auto-route  （auth:true）自动分发 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDefectAutoRoute,
  buildDefectAutoRouteReport,
  routeDefect,
  type DefectHandlerV14,
} from "../aggregators/emrQcDefectAutoRouteV14Aggregator.js";

export const emrQcDefectAutoRouteV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-defect-auto-route",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-defect-auto-route:read");
      if (denied) return denied;
      const defect = buildDefectAutoRoute("D001", "心内科", "时限类");
      return json(ok(defect));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-defect-auto-route",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-defect-auto-route:write");
      if (denied) return denied;
      const body = await c.req.json();
      const defect = buildDefectAutoRoute(
        String(body?.defectId ?? "D001"),
        String(body?.dept ?? "心内科"),
        String(body?.defectType ?? "时限类"),
      );
      const handlers: DefectHandlerV14[] = Array.isArray(body?.handlers)
        ? body.handlers.map((h: unknown) => ({
            type: String((h as DefectHandlerV14)?.type ?? ""),
            handler: String((h as DefectHandlerV14)?.handler ?? ""),
          }))
        : [];
      const result = routeDefect(defect, handlers);
      const report = buildDefectAutoRouteReport(result);
      return json(ok({ defect, handlers, result, report }));
    },
  },
];

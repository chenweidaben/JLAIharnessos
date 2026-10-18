/**
 * 健澜科技 jlmedaios - 病历整改自动跟踪 V14 路由（M521-D，M521 收官）
 *
 * GET  /api/v1/emr-qc-rectification-tracking  （read，auth:true）返回整改跟踪基础数据
 * POST /api/v1/emr-qc-rectification-tracking  （auth:true）跟踪整改 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRectificationTracking,
  buildRectificationTrackingReport,
  trackRectification,
} from "../aggregators/emrQcRectificationTrackingV14Aggregator.js";

export const emrQcRectificationTrackingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-rectification-tracking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rectification-tracking:read");
      if (denied) return denied;
      const tracking = buildRectificationTracking("D001", "张医生", 7);
      return json(ok(tracking));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-rectification-tracking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rectification-tracking:write");
      if (denied) return denied;
      const body = await c.req.json();
      const tracking = buildRectificationTracking(
        String(body?.defectId ?? "D001"),
        String(body?.owner ?? "张医生"),
        Number(body?.deadlineDays ?? 7),
      );
      const daysElapsed = Number(body?.daysElapsed ?? 0);
      const completed = Boolean(body?.completed);
      const result = trackRectification(tracking, daysElapsed, completed);
      const report = buildRectificationTrackingReport(result);
      return json(ok({ tracking, daysElapsed, completed, result, report }));
    },
  },
];

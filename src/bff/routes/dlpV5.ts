/**
 * 健澜科技 jlmedaios - 操作审计与数据防泄漏 DLP V5 路由（M282-C）
 *
 * GET  /api/v1/dlp（DLP 事件看板）
 * POST /api/v1/dlp/export（导出审批）
 * GET  /api/v1/dlp/alert（告警列表）
 *
 * 权限：dlp:read / dlp:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  alertDLPV5,
  assessExportRiskV5,
  buildDlpV5Report,
  detectDLPV5,
  type DLPEvent,
  type ExportRequest,
} from "../aggregators/dlpV5Aggregator.js";

const eventStore: DLPEvent[] = [
  { userId: "u-001", action: "export", resource: "patient", rowCount: 5000, sensitiveFields: ["id_card"] },
  { userId: "u-002", action: "query", resource: "lab", rowCount: 50, sensitiveFields: [] },
];

const exportStore: ExportRequest[] = [];

export const dlpV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dlp",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dlp:read");
      if (denied) return denied;

      return json(ok(buildDlpV5Report(eventStore, exportStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/dlp/export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dlp:write");
      if (denied) return denied;

      const body = await c.req.json() as ExportRequest;
      const risk = assessExportRiskV5(body);
      exportStore.push(body);
      return json(ok({ export: body, ...risk, approved: !risk.needsApproval }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/dlp/alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dlp:read");
      if (denied) return denied;

      const alerts = eventStore
        .map((e) => ({ event: e, detection: detectDLPV5(e), alert: alertDLPV5(e) }))
        .filter((x) => x.detection.risk !== "low");
      return json(ok({ alerts }));
    },
  },
];

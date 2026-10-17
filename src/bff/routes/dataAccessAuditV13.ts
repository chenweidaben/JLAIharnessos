/**
 * 健澜科技 jlmedaios - 数据访问审计异常 V13 路由（M318-D）
 *
 * GET /api/v1/data-access-audit?userId=
 *
 * 权限：data-access-audit:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  detectAfterHoursAccessV13,
  detectBulkExportV13,
  detectOverAccessV13,
  type DataAccessLogV13,
} from "../aggregators/dataAccessAuditV13Aggregator.js";

const logs: DataAccessLogV13[] = [
  { logId: "l1", userId: "u1", accessHour: 10, hasPermission: true, exportRecordCount: 100 },
  { logId: "l2", userId: "u1", accessHour: 11, hasPermission: true, exportRecordCount: 200 },
  { logId: "l3", userId: "u1", accessHour: 14, hasPermission: true, exportRecordCount: 300 },
  { logId: "l4", userId: "u1", accessHour: 15, hasPermission: true, exportRecordCount: 500 },
  { logId: "l5", userId: "u1", accessHour: 22, hasPermission: true, exportRecordCount: 100 },
  { logId: "l6", userId: "u1", accessHour: 23, hasPermission: true, exportRecordCount: 200 },
  { logId: "l7", userId: "u1", accessHour: 7, hasPermission: true, exportRecordCount: 300 },
  { logId: "l8", userId: "u1", accessHour: 10, hasPermission: false, exportRecordCount: 100 },
  { logId: "l9", userId: "u1", accessHour: 11, hasPermission: false, exportRecordCount: 200 },
  { logId: "l10", userId: "u1", accessHour: 14, hasPermission: true, exportRecordCount: 5000 },
];

export const dataAccessAuditV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-access-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-access-audit:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const userId = url.searchParams.get("userId") ?? "u1";
      const filtered = logs.filter((l) => l.userId === userId);
      const threshold = 1000;
      return json(ok({
        userId,
        afterHours: detectAfterHoursAccessV13(filtered),
        overAccess: detectOverAccessV13(filtered),
        bulkExport: detectBulkExportV13(filtered, threshold),
      }));
    },
  },
];

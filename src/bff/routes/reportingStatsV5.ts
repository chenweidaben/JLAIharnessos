/**
 * 健澜科技 jlmedaios - 卫生健康统计与医改监测上报 V5 路由（M278-A）
 *
 * GET  /api/v1/reporting-stats（报表目录）
 * POST /api/v1/reporting-stats/generate（生成校验）
 * POST /api/v1/reporting-stats/submit（上报）
 *
 * 权限：reporting-stats:read / reporting-stats:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildReportingStatsV5Report,
  buildStatReportV5,
  validateReportV5,
  type StatRecord,
  type StatReport,
} from "../aggregators/reportingStatsV5Aggregator.js";

const taskStore: { status: StatReport["status"]; valid: boolean }[] = [
  { status: "submitted", valid: true },
  { status: "validated", valid: true },
  { status: "draft", valid: false },
];

export const reportingStatsV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/reporting-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "reporting-stats:read");
      if (denied) return denied;

      return json(ok(buildReportingStatsV5Report(taskStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/reporting-stats/generate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "reporting-stats:write");
      if (denied) return denied;

      const body = await c.req.json() as { records: StatRecord[]; period: string };
      const report = buildStatReportV5(body.records, body.period);
      const validation = validateReportV5(report);
      return json(ok({ report, validation }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/reporting-stats/submit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "reporting-stats:write");
      if (denied) return denied;

      const body = await c.req.json() as { report: StatReport };
      const validation = validateReportV5(body.report);
      if (!validation.valid) {
        return json(ok({ submitted: false, reason: "校验未通过", issues: validation.issues }));
      }
      taskStore.push({ status: "submitted", valid: true });
      return json(ok({ submitted: true }));
    },
  },
];
